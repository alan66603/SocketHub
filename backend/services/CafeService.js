// search, de-duplication, saving

const axios = require("axios");
const Cafe = require("../models/Cafe");
const ResolutionLog = require("../models/ResolutionLog");
const AIService = require("./AIService");

class CafeService {
  _getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius (km)
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) *
        Math.cos(this._deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return in meters
  }

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  async getAllCafes() {
    return await Cafe.find().sort({ createdAt: -1 });
  }

  async hybridSearch(lat, lng, radius) {
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    // A. Fetch nearby cafes from Google Maps
    // Using Google New Places API (searchNearby)
    const googleResponse = await axios.post(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius, // unit: meters
          },
        },
        includedTypes: ["cafe", "coffee_shop"],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          // Specify required fields (FieldMask) to reduce cost
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount",
        },
      }
    );

    const googlePlaces = googleResponse.data.places || [];

    // B. Fetch local database
    // For simplicity, fetch all local cafes for comparison.
    // (Advanced: use MongoDB $near query, but data volume is currently small)
    const allLocalCafes = await Cafe.find();

    // Track which local cafe IDs have already been matched
    // to prevent two Google places from claiming the same local cafe
    const usedLocalIds = new Set();
    const mergedResults = [];
    const updatePromises = [];

    for (const gPlace of googlePlaces) {
      let localMatch = null;

      // Cannot use array.find here because of async AI calls inside,
      // so use a traditional for loop instead
      for (const local of allLocalCafes) {
        if (usedLocalIds.has(local._id.toString())) continue;

        // 1. ID match (fastest, highest priority)
        if (local.googlePlaceId === gPlace.id) {
          localMatch = local;
          break;
        }

        // 2. Distance filter
        const dist = this._getDistance(
          local.location.coordinates[1],
          local.location.coordinates[0],
          gPlace.location.latitude,
          gPlace.location.longitude
        );

        // 3. AI as the final judge (only when distance < 30m)
        if (dist < 30) {
          // Check if this pair has been evaluated before
          const existingLog = await ResolutionLog.findOne({
            localCafeId: local._id,
            googlePlaceId: gPlace.id,
          });

          let isSame = false;

          if (existingLog) {
            // A. Previously judged: use cached result, no AI cost
            isSame = existingLog.isSame;
          } else {
            // B. Not judged yet: call AI
            console.log(
              `AI check: ${local.name} vs ${gPlace.displayName.text}`
            );
            const aiResult = await AIService.checkSimilarity(
              local.name,
              gPlace.displayName?.text,
              dist
            );

            // Save the result regardless of true/false
            await ResolutionLog.findOneAndUpdate(
              {
                localCafeId: local._id,
                googlePlaceId: gPlace.id,
              },
              {
                isSame: aiResult,
                aiReason: "Gemini check",
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            isSame = aiResult;
          }

          if (isSame) {
            localMatch = local;
            break;
          }
        }
      }

      if (localMatch) {
        // [Case 1] Found a local match (via ID or distance)
        usedLocalIds.add(localMatch._id.toString());
        let needSave = false;

        // Self-healing: if matched by distance but missing googlePlaceId, fill it in.
        // Next search will match by ID directly, skipping distance calc.
        if (!localMatch.googlePlaceId) {
          localMatch.googlePlaceId = gPlace.id;
          needSave = true;
        }

        // Sync name
        const googleName = gPlace.displayName?.text;
        if (googleName && localMatch.name !== googleName) {
          localMatch.name = googleName;
          needSave = true;
        }

        // Sync address
        const googleAddress = gPlace.formattedAddress;
        if (googleAddress && localMatch.location.address !== googleAddress) {
          localMatch.location.address = googleAddress;
          needSave = true;
        }

        if (needSave) {
          updatePromises.push(localMatch.save());
        }

        mergedResults.push({
          ...localMatch.toObject(),
          source: "hybrid",
          ratings: {
            ...localMatch.ratings,
            googleRating: gPlace.rating,
          },
        });
      } else {
        // [Case 2] Brand new place not in local DB
        mergedResults.push({
          _id: gPlace.id,
          googlePlaceId: gPlace.id,
          name: gPlace.displayName?.text || "Unnamed cafe",
          location: {
            type: "Point",
            coordinates: [gPlace.location.longitude, gPlace.location.latitude],
            address: gPlace.formattedAddress,
          },
          ratings: {
            wifiStability: 0,
            googleRating: gPlace.rating,
            googleRatingCount: gPlace.userRatingCount,
          },
          tags: [],
          features: { hasManySockets: "unknown", timeLimit: "unknown" },
          source: "google",
        });
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Batch updated ${updatePromises.length} records`);
    }

    return mergedResults;
  }

  async contribute(data) {
    const {
      googlePlaceId,
      name,
      address,
      lat,
      lng,
      newTags = [],
      wifiRating,
      socketStatus,
      timeStatus,
      comment,
    } = data;

    let cafe;

    // 1. Look up the cafe in the database
    if (googlePlaceId) {
      cafe = await Cafe.findOne({ googlePlaceId });
    }

    // 2. If not found (first-time edit of a Google place), create a new record
    if (!cafe) {
      console.log("Creating new local record (from Google):", name);
      cafe = new Cafe({
        googlePlaceId,
        name,
        location: {
          type: "Point",
          coordinates: [lng, lat],
          address,
        },
        ratings: { wifiStability: 0, wifiVoteCount: 0 },
        features: { hasManySockets: "unknown", timeLimit: "unknown" },
      });
    }

    // 3. Update tags (deduplicate)
    if (newTags.length > 0) {
      newTags.forEach((tag) => {
        if (!cafe.tags.includes(tag)) {
          cafe.tags.push(tag);
        }
      });
    }

    // 4. Update WiFi rating (weighted average)
    if (wifiRating && Number(wifiRating) > 0) {
      const currentScore = cafe.ratings.wifiStability || 0;
      const currentCount = cafe.ratings.wifiVoteCount || 0;

      // Formula: (old score * old count + new score) / (old count + 1)
      const newScore =
        (currentScore * currentCount + Number(wifiRating)) / (currentCount + 1);

      cafe.ratings.wifiStability = parseFloat(newScore.toFixed(1));
      cafe.ratings.wifiVoteCount = currentCount + 1;
    }

    // 5. Update socket & time limit (latest report wins)
    if (socketStatus && socketStatus !== "unknown") {
      cafe.features.hasManySockets = socketStatus;
    }
    if (timeStatus && timeStatus !== "unknown") {
      cafe.features.timeLimit = timeStatus;
    }

    // 6. Add comment
    if (comment && comment.trim().length > 0) {
      cafe.comments.push({ text: comment });
    }

    await cafe.save();
    return cafe;
  }
}

module.exports = new CafeService();

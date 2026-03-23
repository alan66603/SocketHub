// get HTTP req -> send req Service -> return res 
const cafeService = require("../services/CafeService");

class CafeController {
  async search(req, res) {
    try {
      const { lat, lng, radius = 1000 } = req.body;

      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return res.status(400).json({ message: "lat and lng is required" });
      }
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      const parsedRadius = Number(radius);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        return res.status(400).json({ message: "lat should be number between -90 to 90" });
      }
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({ message: "lng should be number between -180 to 180" });
      }
      if (isNaN(parsedRadius) || parsedRadius < 1 || parsedRadius > 50000) {
        return res.status(400).json({ message: "radius should be number between 1 to 50000" });
      }

      const results = await cafeService.hybridSearch(parsedLat, parsedLng, parsedRadius);

      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "search failed", error: error.message });
    }
  }

  async contribute(req, res) {
    try {
      const { googlePlaceId, name, address, lat, lng, wifiRating, socketStatus, timeStatus, comment, newTags } = req.body;

      if (!googlePlaceId || typeof googlePlaceId !== "string") {
        return res.status(400).json({ message: "googlePlaceId is required" });
      }
      if (lat !== undefined && (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90)) {
        return res.status(400).json({ message: "lat should be number between -90 to 90" });
      }
      if (lng !== undefined && (isNaN(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)) {
        return res.status(400).json({ message: "lng should be number between -180 to 180" });
      }
      if (wifiRating !== undefined && (isNaN(Number(wifiRating)) || Number(wifiRating) < 0 || Number(wifiRating) > 5)) {
        return res.status(400).json({ message: "wifiRating should be number between 0 to 5" });
      }
      if (socketStatus !== undefined && !["many", "few", "none", "unknown"].includes(socketStatus)) {
        return res.status(400).json({ message: "socketStatus is invalid" });
      }
      if (timeStatus !== undefined && !["limited", "unlimited", "unknown"].includes(timeStatus)) {
        return res.status(400).json({ message: "timeStatus is invalid" });
      }
      if (comment !== undefined && typeof comment === "string" && comment.length > 500) {
        return res.status(400).json({ message: "comment must not exceed 500 characters" });
      }
      if (newTags !== undefined && (!Array.isArray(newTags) || newTags.length > 20)) {
        return res.status(400).json({ message: "newTags must be an array with at most 20 elements" });
      }

      const result = await cafeService.contribute({ googlePlaceId, name, address, lat, lng, wifiRating, socketStatus, timeStatus, comment, newTags: newTags || [] });
      res.json({ message: "Contribute success", cafe: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Contribute failed", error: error.message });
    }
  }

  async getAll(_req, res){
    try{
        const cafes = await cafeService.getAllCafes();
        res.json(cafes);
    } catch (error){
        console.error(error);
        res.status(500).json({ message: "Failed to fetch cafes", error: error.message });
    }
  }
}

module.exports = new CafeController();

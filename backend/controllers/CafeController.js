// get HTTP req -> send req Service -> return res
const cafeService = require("../services/CafeService");

class CafeController {
  async search(req, res) {
    try {
      const { lat, lng, radius = 1000 } = req.body;

      const results = await cafeService.hybridSearch(lat, lng, radius);

      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "搜尋失敗", error: error.message });
    }
  }

  async contribute(req, res) {
    try {
      const result = await cafeService.contribute(req.body);
      res.json({ message: "更新成功", cafe: result });
    } catch (error) {
      res.status(500).json({ message: "更新失敗", error: error.message });
    }
  }

  async getAll(req, res){
    try{
        const cafes = await cafeService.getAllCafes();
        res.json(cafes);
    } catch (error){
        console.error(error);
        res.status(500).json({message: "取得資料失敗", error: error.message});
    }
  }
}

module.exports = new CafeController();

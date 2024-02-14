const express = require("express");
const router = express.Router();
const product = require("./models/product");
const { Sequelize, Op, fn, col } = require("sequelize");
const formidable = require("formidable");
const path = require("path");
const fs = require("fs-extra");
const constants = require("./constant");

router.get("/product", async (req, res) => {
  const result = await product.findAll({ order: Sequelize.literal("id DESC") });
  res.json(result);
});

// Upload Image
const uploadImage = async (files, doc) => {
  if (files.image != null) {
    console.log(files.image[0].originalFilename);
    var fileExtention = files.image[0].originalFilename.split(".")[1];

    doc.image = `${doc.id}.${fileExtention}`;
    var newpath =path.resolve(__dirname + "/uploaded/images/") + "/" + doc.image;
    
    if (fs.exists(newpath)) {
      await fs.remove(newpath);
    }
    await fs.moveSync(files.image[0].filepath, newpath);

    // Update database
    let result = product.update(
      { image: doc.image },
      { where: { id: doc.id } }
    );
    return result;
  }
};

router.post("/product", (req, res) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (error, fields, files) => {
      let result = await product.create({
        name: fields.name[0],
        stock: fields.stock[0],
        price: fields.price[0]
      });
      result = await uploadImage(files, result);
      res.json({
        result: constants.kResultOk,
        message: JSON.stringify(result),
      });
    });
  } catch (error) {
    res.json({ result: constants.kResultNok, message: JSON.stringify(error) });
  }
});

router.put("/product", (req, res) => {
  try {
    const form = new formidable.IncomingForm();

    form.parse(req, async (error, fields, files) => {

      const save = {};
      save.id = fields.id[0];
      save.name = fields.name[0];
      save.stock = fields.stock[0];
      save.price = fields.price[0];
      if(save.image != null) fields.image = fields.image[0];

      console.log(save);
      console.log(files);
      
      let result = await product.update(save, { where: { id: fields.id[0] } });
      result = await uploadImage(files, fields);
      
      res.json({
        result: constants.kResultOk,
        message: JSON.stringify(result),
      });
    });
  } catch (error) {
    res.json({ result: constants.kResultNok, message: JSON.stringify(error) });
  }
});

router.delete("/product/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let result = await product.findOne({ where: { id } });
    await fs.remove(__dirname + "/uploaded/images/" + result.image);
    result = await product.destroy({ where: { id: id } });
    res.json({ result: constants.kResultOk, message: JSON.stringify(result) });
  } catch (err) {
    console.log(err);
    res.json({ result: constants.kResultNok, message: JSON.stringify(err) });
  }
});

router.get("/product/id/:id", async (req, res) => {
  try {
    let result = await product.findOne({ where: { id: req.params.id } });
    if (result) {
      res.json(result);
    } else {
      res.json({});
    }
  } catch (error) {
    res.json({});
  }
});

router.get("/product/name/:keyword", async (req, res) => {
  console.log("get products by keyword");
  try {
    let keyword = req.params.keyword;
    console.log(keyword);
    const result = await product.findAll({
      where: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("name")),
        "LIKE",
        `%${keyword.toLowerCase()}%`
      ),
    });
    if (result) {
      res.json(result);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.log(error);
    res.json([]);
  }
});

module.exports = router;

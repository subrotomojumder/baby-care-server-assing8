const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "https://baby-care-sotre-frontend.vercel.app/",
      "http://localhost:3000",
    ],
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("baby-care-store");
    const userCollection = db.collection("users");
    const productCollection = db.collection("products");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await userCollection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    app.post("/api/v1/products", async (req, res) => {
      const {
        images,
        title,
        price,
        rating,
        category,
        des,
        flashSale,
        flashSaleDate,
      } = req.body;
      const result = await productCollection.insertOne({
        images,
        title,
        price: price.toString(),
        rating: rating.toString(),
        category,
        des,
        flashSale,
        flashSaleDate,
        createdAt: new Date(),
      });
      res.json({
        success: true,
        message: "Successfully product create!",
        result,
      });
    });
    app.get("/api/v1/products", async (req, res) => {
      const { limit, sortby, sort } = req.query;
      const queryExclude = ["limit", "sortby", "sort"];
      const sortValue = sortby
        ? {
            [sortby]: sort === "des" ? -1 : 1,
          }
        : {
            createdAt: -1,
          };
      const queries = {};
      Object.entries(req.query).forEach(([field, value]) => {
        if (!queryExclude.includes(field)) {
          queries[field] = value === "true" ? true : value;
        }
      });
      if (limit) {
        const data = await productCollection
          .find(queries)
          .sort(sortValue)
          .limit(Number(limit))
          .toArray();
        res.json({
          success: true,
          message: "successfully retrieve products!",
          data,
        });
      } else {
        const data = await productCollection
          .find(queries)
          .sort(sortValue)
          .toArray();
        res.json({
          success: true,
          message: "successfully retrieve products!",
          data,
        });
      }
    });
    app.get("/api/v1/products/:id", async (req, res) => {
      const { id } = req.params;
      const data = await productCollection.findOne(new ObjectId(id));
      res.json({
        success: true,
        message: "successfully retrieve products!",
        data,
      });
    });
    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});

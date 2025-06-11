// server.js - Starter Express server for Week 2 assignment

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());


mongoose.connect('mongodb://localhost:27017/Productdb')
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error('Connection error:', err));

// Define Product Schema & Model
const productSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    inStock: { type: Boolean, default: true }
});

const Product = mongoose.model('Product', productSchema);


// Sample in-memory products database
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// TODO: Implement the following routes:

// GET /api/products - Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id - Get a specific product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }); 
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products - Create a new product
app.post('/api/products', async (req, res) => {
    try {
        const { name,description, price, category, inStock } = req.body;
        const newProduct = new Product({ name, description, price, category, inStock });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/products/:id - Update a product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, price } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            {id: req.params.id},
            { name, description, price, category, inStock },
            { new: true, runValidators: true }
        );
        if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// TODO: Implement custom middleware for:
// - Request logging
const logger = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next(); // Move to the next middleware or route handler
};

app.use(logger);

// - Authentication
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key']; // API Key from request headers

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(403).json({ message: 'Forbidden: Invalid API Key' });
    }

    next(); // Allow request to proceed if API key is valid
};

app.use(authenticate); // Apply to all routes or specific ones

// - Error handling
const validateProduct = (req, res, next) => {
    const { name, price, category } = req.body;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Product name is required and must be a string." });
    }

    if (!price || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "Price must be a positive number." });
    }

    if (!category || typeof category !== 'string') {
        return res.status(400).json({ error: "Category is required and must be a string." });
    }

    next();
};

// Apply validation middleware to product routes
app.post('/api/products', validateProduct, async (req, res) => { 
    // Product creation logic
});

app.put('/api/products/:id', validateProduct, async (req, res) => { 
    // Product update logic
});

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal Server Error'
    });
};

app.use(errorHandler); // Add this after all route definitions

// Custom error classes
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

app.get('/api/products/:id', async (req, res, next) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (!product) throw new NotFoundError('Product not found');
        res.json(product);
    } catch (err) {
        next(err); // Forward error to global handler
    }
});

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/products/:id', asyncHandler(async (req, res) => {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) throw new NotFoundError('Product not found');
    res.json(product);
}));


// GET /api/products?category=electronics - Get products by category
// This route allows filtering products by category
app.get('/api/products', async (req, res) => {
    try {
        const filter = {}; // Initialize an empty filter object

        if (req.query.category) {
            filter.category = req.query.category; // Apply category filter
        }

        const products = await Product.find(filter); // Fetch filtered products
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/products?page=1&limit=10 - Get paginated products
// Retrieve page 1 with 10 products per page
app.get('/api/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
        const skip = (page - 1) * limit; // Calculate items to skip

        const products = await Product.find()
            .skip(skip) // Skip previous pages' items
            .limit(limit); // Limit number of items per page

        const total = await Product.countDocuments(); // Get total count of products

        res.json({
            totalProducts: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            pageSize: limit,
            products,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/products/search?name=phone - Search products by name
app.get('/api/products/search', async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: "Please provide a product name to search." });
        }

        const products = await Product.find({
            name: new RegExp(name, 'i') // Case-insensitive search using regex
        });

        if (products.length === 0) {
            return res.status(404).json({ message: "No matching products found." });
        }

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/products/stats - Get product statistics
app.get('/api/products/stats', async (req, res) => {
    try {
        const stats = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

console.log(process.env.PORT); // Example of accessing variables


// Start the server
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});

// Export the app for testing purposes
module.exports = app; 

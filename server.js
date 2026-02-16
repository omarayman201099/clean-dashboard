/* eslint-disable no-console */
// ============================================================
//  Cleaning Products Store — Main Server
// ============================================================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ======================== EXPRESS APP ========================

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (admin UI, customer pages, uploaded images)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======================== CONFIGURATION =====================

const PORT       = process.env.PORT || 3000;
const MONGO_URI  = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'cleaning-store-secret-key-2024';

// ======================== MONGODB ===========================
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

mongoose
  .connect(MONGO_URI, clientOptions)
  .then(() => {
    // Mask credentials when logging the URI
   
    console.log('MongoDB connected',);
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ======================== SCHEMAS & MODELS ==================

const adminSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:  { type: String, required: true },
  phone:     { type: String, trim: true },
  role:      { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

const customerSchema = new mongoose.Schema({
  username:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:  { type: String, required: true },
  phone:     { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date },
});

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true },
  stock:       { type: Number, default: 0, min: 0 },
  image:       { type: String, default: '/uploads/placeholder.svg' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date },
});

const orderSchema = new mongoose.Schema({
  customerName:  { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  address:       { type: String, required: true },
  items:         { type: Array, default: [] },
  totalAmount:   { type: Number, default: 0 },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

const Admin    = mongoose.model('Admin', adminSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Category = mongoose.model('Category', categorySchema);
const Product  = mongoose.model('Product', productSchema);
const Order    = mongoose.model('Order', orderSchema);

// ======================== FILE UPLOAD =======================

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  },
});

// ======================== JWT HELPERS ========================

/**
 * Generate a signed JWT.
 * @param {object} payload - Data to encode (e.g. { id, type }).
 * @returns {string} Signed token.
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Express middleware — verifies Bearer token and attaches decoded
 * payload to `req.user`.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Validate that a string is a valid MongoDB ObjectId.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ============================================================
//  ROUTES — CUSTOMER AUTH
// ============================================================

app.post('/api/customers/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    await Customer.create({ username, email, password: hash, phone });

    res.status(201).json({ message: 'Customer registered successfully' });
  } catch (err) {
    console.error('Customer register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/customers/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: customer._id, type: 'customer' });
    res.json({ token });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/customers/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'customer') {
      return res.status(403).json({ error: 'Not a customer token' });
    }

    const customer = await Customer.findById(req.user.id).select('-password');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    console.error('GET /api/customers/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
//  ROUTES — ADMIN AUTH
// ============================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // First registered admin becomes superadmin
    const count = await Admin.countDocuments();
    const role  = count === 0 ? 'superadmin' : 'admin';

    const hash  = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, email, password: hash, role, phone });
    const token = generateToken({ id: admin._id, type: 'admin' });

    res.status(201).json({
      token,
      admin: { id: admin._id, username, email, role },
    });
  } catch (err) {
    console.error('Admin register error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: admin._id, type: 'admin' });
    res.json({
      token,
      admin: {
        id:       admin._id,
        username: admin.username,
        email:    admin.email,
        phone:    admin.phone,
        role:     admin.role,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Not an admin token' });
    }

    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
//  ROUTES — CATEGORIES
// ============================================================

// List all categories
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Get single category
app.get('/api/categories/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (err) {
    console.error('GET /api/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

// Create category (protected)
app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (err) {
    console.error('POST /api/categories error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (protected)
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, description } = req.body;
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    category.updatedAt = Date.now();

    await category.save();
    res.json(category);
  } catch (err) {
    console.error('PUT /api/categories/:id error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (protected — blocked when products use it)
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category that has products' });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('DELETE /api/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============================================================
//  ROUTES — PRODUCTS
// ============================================================

// List products (optional ?category= and ?all=true filters)
app.get('/api/products', async (req, res) => {
  try {
    const { category, all } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    // By default hide out-of-stock products; admin passes ?all=true
    if (!all || all === 'false') {
      filter.stock = { $gt: 0 };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// Create product (protected, with image upload)
app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'name, price and category are required' });
    }

    const product = await Product.create({
      name,
      description,
      price:    parseFloat(price),
      category,
      stock:    parseInt(stock, 10) || 0,
      image:    req.file ? '/uploads/' + req.file.filename : '/uploads/placeholder.svg',
    });

    res.status(201).json(product);
  } catch (err) {
    console.error('POST /api/products error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (protected, with optional image upload)
app.put('/api/products/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { name, description, price, category, stock } = req.body;

    if (name !== undefined)        product.name        = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined)       product.price       = parseFloat(price);
    if (category !== undefined)    product.category    = category;
    // FIX: use !== undefined instead of truthy check so stock=0 works
    if (stock !== undefined)       product.stock       = parseInt(stock, 10);

    // Handle new image — delete old file
    if (req.file) {
      if (product.image && product.image !== '/uploads/placeholder.svg') {
        const oldPath = path.join(__dirname, product.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      product.image = '/uploads/' + req.file.filename;
    }

    product.updatedAt = Date.now();
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('PUT /api/products/:id error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (protected)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Remove uploaded image file
    if (product.image && product.image !== '/uploads/placeholder.svg') {
      const oldPath = path.join(__dirname, product.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================================
//  ROUTES — ORDERS
// ============================================================

// List all orders (protected)
app.get('/api/orders', authenticateToken, async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Get single order (protected)
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

// Create order (public — customers place orders)
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, address, items, totalAmount } = req.body;

    if (!customerName || !customerEmail || !address) {
      return res.status(400).json({ error: 'customerName, customerEmail and address are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Decrement stock atomically — rollback on failure
    const decremented = [];

    for (const item of items) {
      const prodId = item.id;
      const qty    = Number(item.quantity) || 1;

      if (!isValidObjectId(prodId)) {
        for (const d of decremented) {
          await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
        }
        return res.status(400).json({ error: `Invalid product ID: ${prodId}` });
      }

      const updated = await Product.findOneAndUpdate(
        { _id: prodId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
      );

      if (!updated) {
        for (const d of decremented) {
          await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
        }
        return res.status(400).json({ error: `Insufficient stock for "${item.name || prodId}"` });
      }

      decremented.push({ id: prodId, qty });
    }

    const order = await Order.create({
      customerName,
      customerEmail,
      customerPhone,
      address,
      items,
      totalAmount,
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (protected)
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status    = status;
    order.updatedAt = Date.now();
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('PUT /api/orders/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order (protected)
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('DELETE /api/orders/:id error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ============================================================
//  ROUTES — STATS
// ============================================================

app.get('/api/stats', authenticateToken, async (_req, res) => {
  try {
    const [totalProducts, totalOrders, totalAdmins, salesAgg, statusAgg] =
      await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        Admin.countDocuments(),
        Order.aggregate([{ $group: { _id: null, sum: { $sum: '$totalAmount' } } }]),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

    const totalSales = salesAgg[0]?.sum || 0;

    const ordersByStatus = {};
    statusAgg.forEach((s) => {
      ordersByStatus[s._id] = s.count;
    });

    res.json({ totalProducts, totalOrders, totalAdmins, totalSales, ordersByStatus });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================================
//  PAGE ROUTES
// ============================================================

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health-check / landing page
app.get('/', (_req, res) => {
  res.send('Cleaning Store Backend Running');
});

// ============================================================
//  ERROR HANDLERS
// ============================================================

// Multer & general errors
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);

  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
  }

  res.status(500).json({ error: 'Something went wrong.' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ============================================================
//  START SERVER  (single call — no duplicate listen)
// ============================================================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('  Cleaning Products Store Backend');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Admin dashboard:   http://localhost:${PORT}/admin`);
  console.log('='.repeat(50));
});

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const winston = require('winston');
const Joi = require('joi');
const path = require('path');

// --- Logger Setup ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// --- Database Setup ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'orders.db'),
  logging: (msg) => logger.debug(msg) // Log SQL queries to debug
});

const Order = sequelize.define('Order', {
  customerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  items: {
    type: DataTypes.JSON, // Store items as JSON string
    allowNull: true
  }
});

// --- Validation Schemas ---
const createOrderSchema = Joi.object({
  customerName: Joi.string().min(3).required(),
  totalAmount: Joi.number().positive().required(),
  status: Joi.string().valid('pending', 'shipped', 'delivered', 'cancelled').optional(),
  items: Joi.array().items(Joi.object()).optional()
});

const updateOrderSchema = Joi.object({
  customerName: Joi.string().min(3).optional(),
  totalAmount: Joi.number().positive().optional(),
  status: Joi.string().valid('pending', 'shipped', 'delivered', 'cancelled').optional(),
  items: Joi.array().items(Joi.object()).optional()
}).min(1); // Require at least one field to update

// --- Middleware ---
const simulateChaos = (req, res, next) => {
  // 10% chance of failure
  if (Math.random() < 0.1) {
    const errors = [
      { status: 503, message: 'Service Unavailable: Database connection pool exhausted' },
      { status: 504, message: 'Gateway Timeout: Upstream service did not respond' },
      { status: 500, message: 'Internal Server Error: Transaction deadlock detected' }
    ];
    const error = errors[Math.floor(Math.random() * errors.length)];
    
    logger.error(error.message, { 
      path: req.path, 
      method: req.method,
      simulated: true 
    });
    
    return res.status(error.status).json({ error: error.message });
  }
  next();
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      logger.warn(`Invalid request body: ${error.details[0].message}`, { body: req.body });
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

// --- Express App ---
const app = express();
app.use(express.json());
app.use(simulateChaos);

// 1. Create Order
app.post('/orders', validateBody(createOrderSchema), async (req, res) => {
  try {
    const order = await Order.create(req.body);
    logger.info('Order created', { orderId: order.id });
    res.status(201).json(order);
  } catch (err) {
    logger.error('Error creating order', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Get All Orders / Search
app.get('/orders', async (req, res) => {
  try {
    const { status, customerName } = req.query;
    const where = {};

    if (status) where.status = status;
    if (customerName) where.customerName = { [Op.like]: `%${customerName}%` };

    const orders = await Order.findAll({ where });
    logger.info('Orders retrieved', { count: orders.length, query: req.query });
    res.json(orders);
  } catch (err) {
    logger.error('Error retrieving orders', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Get Order by ID
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      logger.warn('Order not found', { orderId: req.params.id });
      return res.status(404).json({ error: 'Order not found' });
    }
    logger.info('Order retrieved', { orderId: order.id });
    res.json(order);
  } catch (err) {
    logger.error('Error retrieving order', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Partial Update Order
app.patch('/orders/:id', validateBody(updateOrderSchema), async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      logger.warn('Order not found for update', { orderId: req.params.id });
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.update(req.body);
    logger.info('Order updated', { orderId: order.id, updates: req.body });
    res.json(order);
  } catch (err) {
    logger.error('Error updating order', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Delete Order
app.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      logger.warn('Order not found for deletion', { orderId: req.params.id });
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.destroy();
    logger.info('Order deleted', { orderId: req.params.id });
    res.status(204).send();
  } catch (err) {
    logger.error('Error deleting order', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;

// Sync DB and start listening
sequelize.sync().then(() => {
  logger.info('Database synced');
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}).catch(err => {
  logger.error('Failed to sync database', { error: err.message });
});

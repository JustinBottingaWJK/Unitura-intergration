const { getOrders } = require('./getOrders')
const { getOrderById } = require('./getOrderById')
const { checkProjectOrdersProperties } = require('./checkProjectOrdersProperties')
const { checkOrdersProperties } = require('./checkOrdersProperties')

module.exports = {
  getOrders,
  getOrderById,
  checkProjectOrdersProperties,
  checkOrdersProperties
}
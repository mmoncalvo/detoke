const successResponse = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, data, message });
};

const errorResponse = (res, error, status = 400) => {
  return res.status(status).json({ success: false, error });
};

module.exports = { successResponse, errorResponse };

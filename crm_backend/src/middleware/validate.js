module.exports = function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      return res.status(400).json({ error: messages, code: 'VALIDATION_ERROR' });
    }
    next();
  };
};

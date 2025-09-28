// /api/hello.js (테스트용)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({ 
    message: "Hello from Vercel!",
    method: req.method,
    timestamp: new Date().toISOString() 
  });
};

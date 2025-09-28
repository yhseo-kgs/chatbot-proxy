// 테스트용 API
module.exports = async (req, res) => {
  return res.status(200).json({ 
    message: "API 함수가 정상 작동합니다!", 
    timestamp: new Date().toISOString() 
  });
};

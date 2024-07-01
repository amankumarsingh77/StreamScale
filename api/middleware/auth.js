const jwt = require('jsonwebtoken');

const protectedRoute = (req, res, next) => {
    const {token} = req.cookies;
    if(!token){
        return res.status(401).json(
            {
                message: 'Not authorized',
                status: 401
            }
        );
    }
    const {userId} = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = userId;
    next();
}

module.exports = {
    protectedRoute
}
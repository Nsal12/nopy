const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        if (!req.body || typeof req.body !== 'object') {
            throw new Error("Invalid request body");
        }
        
        const bodyString = JSON.stringify(req.body);
        const uData = bodyString.includes('"') ? bodyString.split('"')[1].split('\\n') : [];
        
        if (uData.length < 2) {
            throw new Error("Incomplete login data");
        }

        const uName = uData[0].split('|');
        const uPass = uData[1].split('|');

        for (let i = 0; i < uData.length - 1; i++) {
            const d = uData[i].split('|');
            if (d.length < 2) continue;
            tData[d[0]] = d[1];
        }

        if (uName[1] && uPass[1]) {
            return res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
        }
    } catch (error) {
        console.error(`Error parsing request: ${error.message}`);
        return res.status(400).send("Invalid request format");
    }

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

app.all('/player/growid/login/validate', (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid request body" });
    }
    
    const { _token, growId, password } = req.body;
    if (!_token || !growId || !password) {
        return res.status(400).json({ status: "error", message: "Missing credentials" });
    }

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    return res.json({
        status: "success",
        message: "Account Validated.",
        token,
        url: "/player/login/dashboard",
        accountType: "growtopia"
    });
});

app.all('/player/growid/register', (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid request body" });
    }
    
    const { growId, password } = req.body;
    if (!growId || !password) {
        return res.status(400).json({ status: "error", message: "Missing registration details" });
    }

    return res.json({
        status: "success",
        message: "Account Registered Successfully.",
        url: "/player/login/dashboard"
    });
});

app.all('/player/growid/checktoken', (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ status: "error", message: "Invalid request body" });
    }
    
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ status: "error", message: "Missing refresh token" });
    }
    return res.json({
        status: 'success',
        message: 'Account Validated.',
        token: refreshToken,
        url: '/player/login/dashboard',
        accountType: 'growtopia',
    });
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});

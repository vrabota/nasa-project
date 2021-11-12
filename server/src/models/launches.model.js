const axios = require('axios');

const launchesDb = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 0;

async function getAllLaunches(skip, limit) {
    return launchesDb
        .find({}, { '_id': 0, '__v': 0 })
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit)
}

async function saveLaunch(launch) {
    await launchesDb.findOneAndUpdate({
        flightNumber: launch.flightNumber
    }, launch, { upsert: true })
}

async function getLatestFlightNumber() {
    const latestLaunch = await launchesDb.findOne().sort('-flightNumber');
    if(!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER
    }
    return latestLaunch.flightNumber;
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({ keplerName: launch.target });

    if(!planet) {
        throw new Error('No matching planet found!');
    }

    const newFlightNumber = await getLatestFlightNumber() + 1;
    const newLaunch = Object.assign(launch, {
        customers: ['NASA', 'ZTM'],
        upcoming: true,
        success: true,
        flightNumber: newFlightNumber
    });
    await saveLaunch(newLaunch);
}

async function findLaunch(filter) {
    return launchesDb.findOne(filter);
}

async function existsLaunchWithId(id) {
    return findLaunch({ flightNumber: id });
}

async function deleteLaunchById(id) {
    const aborted = await launchesDb.updateOne({ flightNumber: id }, { upcoming: false, success: false, });
    return aborted.modifiedCount === 1;
}

async function populateLaunches() {
    const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    });

    if(response.status !== 200) {
        console.log('Problem downloading launch data');
        throw new Error('SpaceX launch data load failed!');
    }

    const launchDocs = response.data.docs;
    for (const launchDoc of launchDocs) {
        const payloads = launchDoc.payloads;
        const customers = payloads.flatMap(payload => payload.customers);
        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc.upcoming,
            success: launchDoc.success,
            customers,
        }
        console.log(`${launch.flightNumber} - ${launch.mission}`);
        await saveLaunch(launch);
    }
}

async function loadLaunchData() {
    console.log('Downloading data from SpaceX API');
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });
    if(firstLaunch) {
        console.log('Launch data already loaded!');
    } else {
        await populateLaunches();
    }
}

module.exports = {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithId,
    deleteLaunchById,
    loadLaunchData,
}
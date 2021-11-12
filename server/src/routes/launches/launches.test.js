const request = require('supertest');
const { omit } = require('lodash');
const app = require('../../app');
const { mongoConnect, mongoDisconnect } = require('../../services/mongo');

describe('Testing /launches API', () => {

    beforeAll(async () => {
        await mongoConnect();
    });

    afterAll(async () => {
        await mongoDisconnect();
    });

    describe('Test GET /launches', () => {

        it('It should respond with 200 success', async () => {
            await request(app)
                .get('/v1/launches')
                .expect('Content-Type', /json/)
                .expect(200)
        })
    });

    describe('Test POST /launches', () => {

        const completeLaunchData = {
            mission: 'USS Enterprise',
            rocket: 'NCC 1701-D',
            target: 'Kepler-1652 b',
            launchDate: 'January 4, 2028',
        }
        const launchDataWithoutDate = omit(completeLaunchData, ['launchDate']);

        it('It should respond with 201 created', async () => {

            const response = await request(app)
                .post('/v1/launches')
                .send(completeLaunchData)
                .expect('Content-Type', /json/)
                .expect(201)

            const requestDate = new Date(completeLaunchData.launchDate).valueOf();
            const responseDate = new Date(response.body.launchDate).valueOf();
            expect(requestDate).toBe(responseDate);
            expect(response.body).toMatchObject(launchDataWithoutDate);
        });
        it('It should catch missing properties', async () => {
            const response = await request(app)
                .post('/v1/launches')
                .send(launchDataWithoutDate)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toStrictEqual({ error: 'Missing required launch property!' })
        });
        it('It should catch invalid dates', async () => {
            const response = await request(app)
                .post('/v1/launches')
                .send(Object.assign(completeLaunchData, { launchDate: 'invalidDate' }))
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toStrictEqual({ error: 'Invalid launch date!' })
        });
    });
});
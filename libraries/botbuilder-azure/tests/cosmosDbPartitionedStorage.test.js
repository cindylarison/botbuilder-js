const assert = require('assert');
const { CosmosDbPartitionedStorage } = require('../lib');
const { StorageBaseTests } = require('../../botbuilder-core/tests/storageBaseTests');
const { CosmosClient } = require('@azure/cosmos');
const { MockMode, usingNock } = require('./mockHelper');
const nock = require('nock');
const fs = require('fs');
const https = require('https');

/**
 * READ THIS BEFORE EDITING THESE TESTS
 * 
 * There are some "oddities" when writing tests for CosmosDbPartitionedStorage due to its use of DoOnce,
 * which is intended to prevent concurrency issues when trying to create the same container twice.
 * 
 * This is mainly addressed by giving each container a unique id through `containerIdSuffix`, since DoOnce is
 * keyed to the containerId. This is also why we call `storage = new CosmosDbPartitionedStorage(settings)` in cleanup;
 * It allows us to ensure we start with a fresh container for each test and forces container re-creation.
 * 
 * Just know that you can get some odd errors (usually "Resource Not Found") if you don't handle container creation manually.
 */

/**
 * @param mode controls the nock mode used for the tests. Available options found in ./mockHelper.js.
 */
const mode = process.env.MOCK_MODE ? process.env.MOCK_MODE : MockMode.lockdown;

const emulatorPath = 'C:/Program Files/Azure Cosmos DB Emulator/CosmosDB.Emulator.exe';

// Endpoint and authKey for the CosmosDB Emulator running locally
let containerIdSuffix = 0;
const getSettings = () => {
    return {
        cosmosDbEndpoint: 'https://localhost:8081',
        authKey: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
        databaseId: 'CosmosPartitionedStorageTestDb',
        containerId: `CosmosPartitionedStorageTestContainer-${ containerIdSuffix++ }`,
        cosmosClientOptions: {
            agent: new https.Agent({ rejectUnauthorized: false }) // rejectUnauthorized disables the SSL verification for the locally-hosted Emulator
        }
    };
};

const checkEmulator = () => {
    if (!fs.existsSync(emulatorPath)) {
        console.warn('This test requires CosmosDB Emulator! go to https://aka.ms/documentdb-emulator-docs to download and install.');
    }
    return true;
};

var storage = new CosmosDbPartitionedStorage(getSettings());

// called after all tests complete
const cleanup = async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    let settings = getSettings();
    let client = new CosmosClient({ endpoint: settings.cosmosDbEndpoint, key: settings.authKey, agent: new https.Agent({ rejectUnauthorized: false }) });
    try {
        await client.database(settings.databaseId).delete();
    } catch (err) { }
};

// called before each test
const prep = async () => {
    nock.cleanAll();
    let settings = getSettings();
    if (mode !== MockMode.lockdown) {
        nock.enableNetConnect();
    } else {
        nock.disableNetConnect();
    }
    let client = new CosmosClient({ endpoint: settings.cosmosDbEndpoint, key: settings.authKey, agent: new https.Agent({ rejectUnauthorized: false }) });
    // This throws if the db is already created. We want to always create it if it doesn't exist,
    // so leaving this here should help prevent failures if the tests change in the future
    try {
        await client.databases.create({ id: settings.databaseId });
    } catch (err) { }
    storage = new CosmosDbPartitionedStorage(settings);
};

const options = {
    scope: getSettings().cosmosDbEndpoint
};

describe('CosmosDbPartitionedStorage - Constructor Tests', function() {
    before('cleanup', cleanup); // Ensure we start from scratch

    it('throws when provided with null options', () => {
        assert.throws(() => new CosmosDbPartitionedStorage(null), ReferenceError('CosmosDbPartitionedStorageOptions is required.'));
    });

    it('throws when no endpoint provided', () => {
        const noEndpoint = getSettings();
        noEndpoint.cosmosDbEndpoint = null;
        assert.throws(() => new CosmosDbPartitionedStorage(noEndpoint), ReferenceError('cosmosDbEndpoint for CosmosDB is required.'));
    });

    it('throws when no authKey provided', () => {
        const noAuthKey = getSettings();
        noAuthKey.authKey = null;
        assert.throws(() => new CosmosDbPartitionedStorage(noAuthKey), ReferenceError('authKey for CosmosDB is required.'));
    });

    it('throws when no databaseId provided', () => {
        const noDatabaseId = getSettings();
        noDatabaseId.databaseId = null;
        assert.throws(() => new CosmosDbPartitionedStorage(noDatabaseId), ReferenceError('databaseId is for CosmosDB required.'));
    });

    it('throws when no containerId provided', () => {
        const noContainerId = getSettings();
        noContainerId.containerId = null;
        assert.throws(() => new CosmosDbPartitionedStorage(noContainerId), ReferenceError('containerId for CosmosDB is required.'));
    });

    it('passes cosmosClientOptions to CosmosClient', async function() {
        const { nockDone } = await usingNock(this.test, mode, options);

        const settingsWithClientOptions = getSettings();
        settingsWithClientOptions.cosmosClientOptions = {
            agent: new https.Agent({ rejectUnauthorized: false }),
            connectionPolicy: { requestTimeout: 999 },
            userAgentSuffix: 'test', 
        };

        let client = new CosmosClient({ endpoint: settingsWithClientOptions.cosmosDbEndpoint, key: settingsWithClientOptions.authKey, agent: new https.Agent({ rejectUnauthorized: false }) });
        await client.databases.create({ id: settingsWithClientOptions.databaseId });
    
        client = new CosmosDbPartitionedStorage(settingsWithClientOptions);
        await client.initialize(); // Force client to go through initialization

        assert.strictEqual(client.client.clientContext.connectionPolicy.requestTimeout, 999);
        assert.strictEqual(client.client.clientContext.cosmosClientOptions.userAgentSuffix, 'test');

        return nockDone();
    });
});

describe('CosmosDbPartitionedStorage - Base Storage Tests', function() {
    beforeEach('prep', prep);
    afterEach('cleanup', cleanup);

    it('return empty object when reading unknown key', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.returnEmptyObjectWhenReadingUnknownKey(storage);
        
        assert.strictEqual(testRan, true);

        return nockDone();
    });

    it('throws when reading null keys', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.handleNullKeysWhenReading(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('throws when writing null keys', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.handleNullKeysWhenWriting(storage);
        
        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('does not throw when writing no items', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.doesNotThrowWhenWritingNoItems(storage);
        
        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('create an object', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.createObject(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('handle crazy keys', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.handleCrazyKeys(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('update an object', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.updateObject(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('delete an object', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.deleteObject(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('does not throw when deleting an unknown object', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.deleteUnknownObject(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('performs batch operations', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.performBatchOperations(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });

    it('proceeds through a waterfall dialog', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const testRan = await StorageBaseTests.proceedsThroughWaterfall(storage);

        assert.strictEqual(testRan, true);
        return nockDone();
    });
    it('support using multiple databases', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const newDb = 'new-db';

        const defaultSettings = getSettings();
        const settingsWithNewDb = getSettings();
        settingsWithNewDb.databaseId = newDb;

        // cosmosDbPartitionedStorage requires the user creates the db,
        // so we need to create it for the test
        let dbCreateClient = new CosmosClient({ endpoint: settingsWithNewDb.cosmosDbEndpoint, key: settingsWithNewDb.authKey, agent: new https.Agent({ rejectUnauthorized: false }) });
        try {
            await dbCreateClient.database(newDb).delete();
        } catch (err) { }
        await dbCreateClient.databases.create({ id: newDb });

        const defaultClient = new CosmosDbPartitionedStorage(defaultSettings);
        await assert.doesNotReject(async () => await defaultClient.initialize());

        const newClient = new CosmosDbPartitionedStorage(settingsWithNewDb);
        await assert.doesNotReject(async () => await newClient.initialize());

        await assert.doesNotReject(async () => await newClient.client.database(newDb).container(settingsWithNewDb.containerId).read());

        await dbCreateClient.database(newDb).delete();
        
        return nockDone();
    });
    it('support using multiple containers', async function() {
        checkEmulator();
        const { nockDone } = await usingNock(this.test, mode, options);

        const newContainer = 'new-container';

        const defaultSettings = getSettings();
        const settingsWithNewContainer = getSettings();
        settingsWithNewContainer.containerId = newContainer;

        const defaultClient = new CosmosDbPartitionedStorage(defaultSettings);
        await assert.doesNotReject(async () => await defaultClient.initialize());

        const newClient = new CosmosDbPartitionedStorage(settingsWithNewContainer);
        await assert.doesNotReject(async () => await newClient.initialize());

        await assert.doesNotReject(async () => await newClient.client.database(settingsWithNewContainer.databaseId).container(newContainer).read());

        return nockDone();
    });
});
const { CosmosClient } = require('@azure/cosmos');

/**
 * Singleton instance of Cosmos DB client
 * Avoids creating multiple client instances which is memory-intensive
 * Reference: Azure Cosmos DB SDK Best Practices
 */
class CosmosDBManager {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
  }

  /**
   * Initialize Cosmos DB connection
   * Follows: SDK Best Practices - Reuse singleton client instance
   */
  async initialize() {
    if (this.client) {
      console.log('ℹ️  Cosmos DB already initialized');
      return this.database;
    }

    try {
      const endpoint = process.env.COSMOS_DB_ENDPOINT;
      const key = process.env.COSMOS_DB_KEY;
      const dbName = process.env.COSMOS_DB_NAME;

      if (!endpoint || !key || !dbName) {
        throw new Error(
          'Missing Cosmos DB configuration. Check .env: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, COSMOS_DB_NAME'
        );
      }

      // Initialize client with retry policy
      this.client = new CosmosClient({
        endpoint,
        key,
        connectionPolicy: {
          retryOptions: {
            maxRetryAttemptCount: 3,
            fixedDelayInMilliseconds: 100
          }
        }
      });

      this.database = this.client.database(dbName);

      console.log('✅ Cosmos DB connected successfully');
      return this.database;
    } catch (error) {
      console.error('❌ Cosmos DB initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get container reference
   * Uses lazy loading to avoid initializing unused containers
   */
  getContainer(containerName) {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    
    if (!this.containers[containerName]) {
      this.containers[containerName] = this.database.container(containerName);
    }
    
    return this.containers[containerName];
  }

  /**
   * Gracefully close connection
   */
  async close() {
    if (this.client) {
      await this.client.dispose();
      console.log('✅ Cosmos DB connection closed');
    }
  }

  /**
   * Log diagnostic information for troubleshooting
   * Reference: SDK Best Practices - Diagnostic logging
   */
  logDiagnostics(error, context = '') {
    if (error.diagnostics) {
      console.error(`🔍 Diagnostic Info [${context}]:`, {
        statusCode: error.code,
        activityId: error.diagnostics.activityId,
        requestCharge: error.diagnostics.requestCharge,
        regions: error.diagnostics.regions
      });
    }
  }
}

module.exports = new CosmosDBManager();
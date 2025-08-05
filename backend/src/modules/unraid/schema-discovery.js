const axios = require('axios');

/**
 * Discover available GraphQL schema fields for Unraid API
 */
async function discoverUnraidSchema() {
  const config = {
    host: '192.168.15.5',
    port: 80,
    api_key: '993ef601cb3ad31dfbefcf08a811f47cdbeb1694fd2987fc170727d1ada896ad'
  };

  // GraphQL introspection query to discover schema
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType {
          name
          fields {
            name
            description
            type {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const url = `http://${config.host}:${config.port}/graphql`;
    console.log(`Discovering Unraid GraphQL schema at: ${url}`);
    
    const response = await axios.post(url, 
      { query: introspectionQuery },
      { 
        headers: {
          'x-api-key': config.api_key,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.error('Introspection errors:', response.data.errors);
      return;
    }

    const schema = response.data.data.__schema;
    const fields = schema.queryType.fields;

    console.log('\n=== Available Unraid GraphQL Query Fields ===');
    fields.forEach(field => {
      console.log(`\n📋 ${field.name}`);
      if (field.description) {
        console.log(`   Description: ${field.description}`);
      }
      console.log(`   Type: ${field.type.name || field.type.kind}`);
      
      if (field.type.fields && field.type.fields.length > 0) {
        console.log('   Available subfields:');
        field.type.fields.slice(0, 10).forEach(subfield => {
          console.log(`     - ${subfield.name}: ${subfield.type.name || subfield.type.kind}`);
        });
        if (field.type.fields.length > 10) {
          console.log(`     ... and ${field.type.fields.length - 10} more fields`);
        }
      }
    });

  } catch (error) {
    console.error('Failed to discover schema:', error.message);
  }
}

// Run discovery
discoverUnraidSchema();
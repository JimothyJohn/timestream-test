import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TimestreamQuery } from '@aws-sdk/client-timestream-query';

const timestreamQuery = new TimestreamQuery({});

// AI-generated comment: Validation regex patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_WINDOW_REGEX = /^[1-9]\d*[mhd]$/;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const timeWindow = event.queryStringParameters?.timeWindow || '1m';
        
        // AI-generated comment: Validate time window format
        if (!TIME_WINDOW_REGEX.test(timeWindow)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid time window format. Must be in the format: [number][m|h|d] (e.g., 1m, 2h, 3d)'
                })
            };
        }

        // AI-generated comment: Handle multiple devices if ids query parameter exists
        const deviceIds = event.queryStringParameters?.ids?.split(',');
        const singleDeviceId = event.pathParameters?.deviceId;

        if (deviceIds) {
            // Validate all device IDs
            if (!deviceIds.every(id => UUID_REGEX.test(id))) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'One or more invalid device IDs. All must be valid UUIDs.'
                    })
                };
            }

            // Query for multiple devices
            const queryString = `
                SELECT 
                    time,
                    id,
                    measure_value::bigint as value,
                    measure_name
                FROM "sampleDB".uplinkDB 
                WHERE id IN ('${deviceIds.join("','")}')
                AND time >= ago(${timeWindow})
                ORDER BY time DESC
            `;

            const queryResult = await timestreamQuery.query({
                QueryString: queryString
            });

            const mappedData = queryResult.Rows.map(row => {
                const [time, id, value, measureName] = row.Data.map(data => data.ScalarValue);
                return { time, id, value: parseInt(value, 10), measureName };
            });

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Query executed successfully',
                    deviceIds,
                    timeWindow,
                    data: mappedData
                }),
            };
        } else if (singleDeviceId) {
            // Original single device logic
            if (!UUID_REGEX.test(singleDeviceId)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Invalid device ID format. Must be a valid UUID.'
                    })
                };
            }

            // AI-generated comment: Using parameterized query with time window
            const queryString = `
                SELECT 
                    time,
                    measure_value::bigint as value,
                    measure_name
                FROM "sampleDB".uplinkDB 
                WHERE id = '${singleDeviceId}'
                AND time >= ago(${timeWindow})
                ORDER BY time DESC
            `;

            const queryResult = await timestreamQuery.query({
                QueryString: queryString
            });

            const mappedData = queryResult.Rows.map(row => {
                const [time, value, measureName] = row.Data.map(data => data.ScalarValue);
                return { time, value: parseInt(value, 10), measureName };
            });

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Query executed successfully',
                    deviceId: singleDeviceId,
                    timeWindow,
                    data: mappedData
                }),
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Must provide either deviceId in path or ids in query string'
                })
            };
        }
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Error querying Timestream',
                error: err instanceof Error ? err.message : 'Unknown error'
            }),
        };
    }
};

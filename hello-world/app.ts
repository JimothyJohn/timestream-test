import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TimestreamQuery } from '@aws-sdk/client-timestream-query';

// AI-generated comment: Initialize Timestream Query client outside handler for reuse across invocations
const timestreamQuery = new TimestreamQuery({});

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // AI-generated comment: Simple query to fetch the most recent records
        const queryString = `
            SELECT *
            FROM "sampleDB".uplinkDB 
            WHERE time >= ago(1h)
        `;

        const queryResult = await timestreamQuery.query({
            QueryString: queryString
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Query executed successfully',
                data: queryResult.Rows
            }),
        };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error querying Timestream',
                error: err instanceof Error ? err.message : 'Unknown error'
            }),
        };
    }
};

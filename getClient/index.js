const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const clientId = event.pathParameters.id;

  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME,
    Key: { ClientID: clientId },
  };

  try {
    const data = await dynamodb.get(params).promise();

    if (data.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify(data.Item),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Client not found" }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to get client.",
        error: error.message,
      }),
    };
  }
};

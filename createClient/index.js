const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
  const { name, email, phone } = JSON.parse(event.body);

  const clientId = uuidv4();

  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME,
    Item: {
      ClientID: clientId,
      Name: name,
      Email: email,
      Phone: phone,
    },
  };

  try {
    await dynamodb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Client created successfully!",
        ClientID: clientId,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to create client.",
        error: error.message,
      }),
    };
  }
};

const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const clientId = event.pathParameters.id;
  const { name, email, phone } = JSON.parse(event.body);

  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME,
    Key: { ClientID: clientId },
    UpdateExpression: "set #name = :name, #email = :email, #phone = :phone",
    ExpressionAttributeNames: {
      "#name": "Name",
      "#email": "Email",
      "#phone": "Phone",
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":email": email,
      ":phone": phone,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const data = await dynamodb.update(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Client updated successfully!",
        updatedAttributes: data.Attributes,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to update client.",
        error: error.message,
      }),
    };
  }
};


# Step-by-Step Guide: Deploying a REST API with AWS API Gateway, Lambda, and DynamoDB Using CloudFormation

This guide will walk you through the process of deploying a REST API using AWS API Gateway, Lambda, and DynamoDB, starting from a CloudFormation template and ensuring everything works with path parameters.

## 1. CloudFormation Template Setup

Start by creating the following CloudFormation template. This template provisions:
- An API Gateway REST API
- Lambda functions (for creating, getting, and updating clients)
- A DynamoDB table for storing client data

### CloudFormation Template Example:

```yaml
Resources:
  # DynamoDB Table to store client data
  ClientsTable:
    Type: AWS::DynamoDB::Table
    Properties: 
      TableName: ClientsTable
      AttributeDefinitions:
        - AttributeName: ClientID
          AttributeType: S
      KeySchema:
        - AttributeName: ClientID
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

  # Lambda execution role
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: LambdaDynamoDBPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                  - dynamodb:GetItem
                  - dynamodb:UpdateItem
                Resource: "*"
                
  # Lambda function to create a client
  CreateClientFunction:
    Type: AWS::Lambda::Function
    Properties: 
      FunctionName: CreateClient
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Code: 
        S3Bucket: your-lambda-code-bucket
        S3Key: create-client.zip
      Runtime: nodejs18.x
      Timeout: 10
      Environment:
        Variables:
          DYNAMO_TABLE_NAME: !Ref ClientsTable

  # Lambda function to get a client by ID
  GetClientFunction:
    Type: AWS::Lambda::Function
    Properties: 
      FunctionName: GetClient
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Code: 
        S3Bucket: your-lambda-code-bucket
        S3Key: get-client.zip
      Runtime: nodejs18.x
      Timeout: 10
      Environment:
        Variables:
          DYNAMO_TABLE_NAME: !Ref ClientsTable

  # API Gateway REST API
  APIGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: ClientsApi

  # API Gateway Resource for /clients
  ClientsResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      ParentId: !GetAtt APIGateway.RootResourceId
      PathPart: clients
      RestApiId: !Ref APIGateway

  # API Gateway Resource for /clients/{id}
  ClientIdResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      ParentId: !Ref ClientsResource
      PathPart: "{id}"
      RestApiId: !Ref APIGateway

  # API Gateway Method for GET /clients/{id}
  GetClientMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      AuthorizationType: NONE
      HttpMethod: GET
      ResourceId: !Ref ClientIdResource
      RestApiId: !Ref APIGateway
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${GetClientFunction.Arn}/invocations

  # API Gateway Method for PUT /clients/{id}
  UpdateClientMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      AuthorizationType: NONE
      HttpMethod: PUT
      ResourceId: !Ref ClientIdResource
      RestApiId: !Ref APIGateway
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CreateClientFunction.Arn}/invocations

Outputs:
  APIGatewayURL:
    Description: "Invoke URL for the API"
    Value: !Sub "https://${APIGateway}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

### Key Components:
- **ClientsTable**: A DynamoDB table with `ClientID` as the primary key.
- **Lambda Functions**: `CreateClient` and `GetClient` Lambda functions.
- **API Gateway**: A REST API with two methods, `GET /clients/{id}` and `PUT /clients/{id}`, integrated with the Lambda functions using **Lambda Proxy Integration**.

## 2. Upload Lambda Code

Once the CloudFormation stack is created, you need to upload the Lambda function code for creating and retrieving clients.

### Example Lambda Code for Create Client (`create-client.js`):

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const { name, email, phone } = JSON.parse(event.body);
    const clientId = uuidv4();

    const params = {
        TableName: process.env.DYNAMO_TABLE_NAME,
        Item: {
            ClientID: clientId,
            Name: name,
            Email: email,
            Phone: phone
        }
    };

    try {
        await dynamodb.put(params).promise();
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Client created successfully!',
                ClientID: clientId
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error creating client.', error: error.message })
        };
    }
};
```

### Example Lambda Code for Get Client by ID (`get-client.js`):

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const clientId = event.pathParameters.id;
    
    const params = {
        TableName: process.env.DYNAMO_TABLE_NAME,
        Key: {
            ClientID: clientId
        }
    };

    try {
        const result = await dynamodb.get(params).promise();
        if (!result.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Client not found' }) };
        }
        return { statusCode: 200, body: JSON.stringify(result.Item) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Error retrieving client.', error: error.message }) };
    }
};
```

## 3. Deploy the API

After creating the stack and uploading the Lambda function code, deploy the API:

1. Go to **API Gateway Console**.
2. Select your API (e.g., `ClientsApi`).
3. Go to **Stages** and select the **prod** stage.
4. Click **Deploy API**.

## 4. Test the API

Once deployed, you can test the API using tools like **curl** or **Postman**.

### Example Requests:

- **Create a New Client (POST /clients)**:
    ```bash
    curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/clients     -H "Content-Type: application/json"     -d '{"name": "John Doe", "email": "john.doe@example.com", "phone": "123-456-7890"}'
    ```

- **Get a Client by ID (GET /clients/{id})**:
    ```bash
    curl -X GET https://<api-id>.execute-api.<region>.amazonaws.com/prod/clients/1234abcd
    ```

## 5. Verify Logs and Debugging

Check **CloudWatch Logs** for your Lambda functions to ensure that the requests are being processed correctly.

- Go to **CloudWatch Console** > **Logs** > Find your Lambda function logs.
- Verify that the `event.pathParameters.id` is correctly logged in the **GetClient** Lambda function.

## 6. Conclusion

Following these steps, you should have a fully functioning REST API using API Gateway, Lambda, and DynamoDB. You can expand this setup to include more methods, resources, or even add authorization mechanisms as needed.

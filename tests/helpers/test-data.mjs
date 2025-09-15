import { DynamoDB } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import Chance from 'chance';

const chance = new Chance();
const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const tableName = process.env.restaurants_table;

export const generateRestaurant = (overrides = {}) => {
  const themes = [
    ['cartoon', 'rick and morty'],
    ['movie', 'star wars'],
    ['netflix', 'stranger things'],
    ['movie', 'harry potter'],
    ['cartoon', 'simpsons'],
    ['netflix', 'the witcher'],
    ['movie', 'marvel'],
    ['cartoon', 'family guy'],
  ];

  const uniqueId = `${Date.now()}_${chance.guid().substring(0, 8)}`;
  const baseName = chance.company();

  return {
    name: `TEST_${baseName}_${uniqueId}`,
    image: `https://${chance.domain()}/images/${chance.guid()}.png`,
    themes: overrides.themes || chance.pickone(themes),
    ...overrides,
  };
};

export const generateRestaurants = (count = 8) => {
  return Array.from({ length: count }, () => generateRestaurant());
};

export const seedRestaurants = async (restaurants) => {
  // Use batch write for better performance
  const chunks = [];
  for (let i = 0; i < restaurants.length; i += 25) {
    chunks.push(restaurants.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const putRequests = chunk.map((restaurant) => ({
      PutRequest: {
        Item: restaurant,
      },
    }));

    await dynamodb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      })
    );
  }

  return restaurants;
};

export const cleanupRestaurants = async (restaurants) => {
  const chunks = [];
  for (let i = 0; i < restaurants.length; i += 25) {
    chunks.push(restaurants.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const deleteRequests = chunk.map((restaurant) => ({
      DeleteRequest: {
        Key: {
          name: restaurant.name,
        },
      },
    }));

    await dynamodb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: deleteRequests,
        },
      })
    );
  }
};

export const seedRestaurant = async (restaurant) => {
  await dynamodb.send(
    new PutCommand({
      TableName: tableName,
      Item: restaurant,
    })
  );

  return restaurant;
};

export const cleanupRestaurant = async (restaurantName) => {
  await dynamodb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        name: restaurantName,
      },
    })
  );
};

// Add this function
export const clearAllRestaurants = async () => {
  const { Items: existingItems } = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
    })
  );

  if (existingItems && existingItems.length > 0) {
    await cleanupRestaurants(existingItems);
  }

  return existingItems || [];
};

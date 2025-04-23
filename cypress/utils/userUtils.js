import userData from '../fixtures/userData.json';

// Generate a unique user using timestamped email and include shipping details
export const generateUniqueUser = () => {
    const timestamp = Date.now();
    const userDetails = userData?.userDetails
    const shippingDetails = userData?.shippingDetails;

    if (!userDetails || !userDetails.email) {
        throw new Error('User details data is missing or malformed in userData.json');
    }

    return {
        ...userDetails,
        email: userDetails.email.replace('@', `+${timestamp}@`),
        ...shippingDetails
    };
};

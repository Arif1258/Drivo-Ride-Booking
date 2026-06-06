const axios = require('axios');
const captainModel = require('../models/captain.model');

module.exports.getAddressCoordinate = async (address) => {
    const apiKey = process.env.MAPBOX_API;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1&country=IN`;

    try {
        const response = await axios.get(url);
        if (response.data.features && response.data.features.length > 0) {
            const [lng, lat] = response.data.features[0].center;
            return {
                ltd: lat,
                lng: lng
            };
        } else {
            throw new Error('Unable to fetch coordinates');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const apiKey = process.env.MAPBOX_API;

    try {
        // Geocode origin
        const originRes = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?access_token=${apiKey}&limit=1&country=IN`
        );
        if (!originRes.data.features || originRes.data.features.length === 0) {
            throw new Error('Unable to geocode origin');
        }
        const [originLng, originLat] = originRes.data.features[0].center;

        // Geocode destination
        const destRes = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${apiKey}&limit=1&country=IN`
        );
        if (!destRes.data.features || destRes.data.features.length === 0) {
            throw new Error('Unable to geocode destination');
        }
        const [destLng, destLat] = destRes.data.features[0].center;

        // Get directions
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${apiKey}&overview=false`;
        const directionsRes = await axios.get(directionsUrl);

        if (!directionsRes.data.routes || directionsRes.data.routes.length === 0) {
            throw new Error('No routes found');
        }

        const route = directionsRes.data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.ceil(route.duration / 60);

        // Return same shape the rest of the app expects
        return {
            distance: {
                text: `${distanceKm} km`,
                value: route.distance   // metres
            },
            duration: {
                text: `${durationMin} mins`,
                value: route.duration   // seconds
            }
        };

    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const apiKey = process.env.MAPBOX_API;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${apiKey}&autocomplete=true&limit=5&country=IN`;

    try {
        const response = await axios.get(url);
        if (response.data.features && response.data.features.length > 0) {
            return response.data.features
                .map(feature => feature.place_name)
                .filter(Boolean);
        } else {
            throw new Error('Unable to fetch suggestions');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    const captains = await captainModel.find({
        location: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ parseFloat(lng), parseFloat(ltd) ]
                },
                $maxDistance: radius * 1000 // Convert km to meters
            }
        }
    });

    return captains;
}

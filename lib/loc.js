const axios = require('axios');

const getCityName = async(latitude, longitude) =>{
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'YourAppName/1.0 (dwiindraputra24@gmail.com)' // Ganti dengan nama aplikasi dan email Anda
      }
    });
    return response;
  } catch (error) {
    console.error('Error fetching geocoding data:', error);
    return 'Error fetching location details.';
  }
}

module.exports = { getCityName }
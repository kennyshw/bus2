const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();  // Add this line to enable environment variables

const app = express();
app.use(cors());

// Enhanced configuration mapping services to their relevant stops
const config = {
    serviceStops: {
        '243W': ['27399'], // Example: 243W only checks at Blk 859 and Koufu
        '258': ['27399'], // 258 checks at three stops
        '181': ['27431', '22009'], // 181 only checks at Boon Lay
        '974': ['27101'], // 974 checks at Admiralty MRT and 676A
        '243G': ['22009'],
        '811': ['59211', '59159'],
        '811T': ['59211'],
        '861': ['59211', '58541'],
        '965': ['59261'],
        '901M': ['46779', '46759', '47491', '47499']
    },
    // Bus stop lookup table
    busStops: {
        '27399': 'B859',
        '27431': 'Koufu',
        '27101': 'O. WWSS',
        '22009': 'Boon Lay',
        '59211': 'J House',
        '59261': 'B174',
        '46779': 'Adm MRT',
        '46759': '676A',
        '47491': 'Twin F',
        '47499': 'ASM',
        '59159': 'YS MRT',
        '58541': 'O. CB MRT'
    }
};

app.use(express.static('./'));

app.get('/api/bus-arrivals', async (req, res) => {
    try {
        // Create a Set of unique bus stops we need to check
        const uniqueStops = new Set(
            Object.values(config.serviceStops).flat()
        );

        // Create promises only for the stops we need
        const promises = Array.from(uniqueStops).map(stopCode => 
            axios.get(`https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${stopCode}`, {
                headers: {
                    'AccountKey': process.env.LTA_API_KEY
                }
            })
        );

        const responses = await Promise.all(promises);
        
        // Process the responses
        const allServices = [];
        responses.forEach((response, index) => {
            const stopCode = Array.from(uniqueStops)[index];
            const services = response.data.Services || [];
            
            services.forEach(service => {
                // Only include the service if it's in our config and this stop is relevant for it
                const relevantStops = config.serviceStops[service.ServiceNo];
                if (relevantStops && relevantStops.includes(stopCode)) {
                    allServices.push({
                        ...service,
                        BusStopName: config.busStops[stopCode],
                        BusStopCode: stopCode
                    });
                }
            });
        });

        res.json({ Services: allServices });
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch bus timings' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
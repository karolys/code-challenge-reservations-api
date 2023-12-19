const mysql = require('mysql2');

let conn;

const APPOINTMENT_DURATION = .25 //Length of an appointment, represents 15 minutes, or 1/4th of an hour.

module.exports = {
    retrieveAllAppointmentSlotsByProviderId: async () => {
        conn = await mysql.createConnection({
            host: process.env.dbHOST,
            user: process.env.dbUSER,
            password: process.env.dbPASSWORD,
            database: process.env.dbDATABASE,
        });

        // Select statement has built in adjustment to ensure only appointments 24 hours in the future are returned
        const sqlQuery = "select * from t_appointment_availability where reservation_id IS NULL AND appointment_start_time >= now() + INTERVAL 1 DAY;";
        const eligibleAvailableAppointmentsQueryResult =  await conn.promise().query(sqlQuery).catch( (err) => {
            console.log("Error getting appointments: " + err);
        });
        const appointmentsResultRows = eligibleAvailableAppointmentsQueryResult[0];

        // TODO: Need to properly error handle and also ensure empty case doesn't break anything
        return appointmentsResultRows;
    },
    updateAppointmentAvailabilityByProviderId: async (providerId, availabilityMap) => {
        conn = await mysql.createConnection({
            host: process.env.dbHOST,
            user: process.env.dbUSER,
            password: process.env.dbPASSWORD,
            database: process.env.dbDATABASE,
        });
        //TODO: Iterate over Map of Dates, convert start and end times to a series of datetimes in 15 minute increments, generate MySQL Inserts and Insert into DB
        // {
        //     "provider_id": 1,
        //     "availability": {
        //     "2023-8-13": [{
        //         "startTime": 8,
        //         "endTime": 11.5
        //     }, {
        //         "startTime": 12,
        //         "endTime": 17
        //     }],
        //     "2023-8-14" : [{
        //         "startTime": 10,
        //         "endTime": 16
        //     }]
        // }

        // INSERT Statement Format: INSERT INTO t_appointment_availability(provider_id,appointment_start_time) VALUES (1,'2023-12-19 08:00:00');
        // Could probably pull this out into a helper function that returns rows to insert
        let availabilitySlotsList = [];

        for (const dateKey in availabilityMap) {
            let dateStr = dateKey;
            const timesArray = availabilityMap[dateKey];

            timesArray.forEach( (timeSpan) =>{
                let { startTime, endTime } = timeSpan;
                for (let i = startTime; i < endTime; i += APPOINTMENT_DURATION) {
                    let hourStrRaw = i.toString().split('.')[0];
                    let minStrRaw = i.toString().split('.')[1];

                    let hourStrConverted = "00";
                    let minStrConverted = "0";

                    hourStrConverted = (hourStrRaw.length === 2)? hourStrRaw : '0' + hourStrRaw;

                    switch (minStrRaw) {
                        case '25':
                            minStrConverted = "15";
                            break;
                        case '5':
                            minStrConverted = "30";
                            break;
                        case '75':
                            minStrConverted = "45";
                            break;
                        default:
                            minStrConverted = "00";
                            break;
                    }

                    let dateTimeStr = `${dateStr} ${hourStrConverted}:${minStrConverted}:00`;
                    availabilitySlotsList.push([providerId, dateTimeStr]);
                }
            });
        }

        const insertResult = await conn.promise().query("INSERT INTO t_appointment_availability (provider_id,appointment_start_time) VALUES ?", [availabilitySlotsList]);
        if (insertResult === null) {
            // Error with inserting, need to improve error handling here, could check to see rows affected vs availabilitySlotsList.length or a few other things
            console.log("Failed to Availability for Provider ID: " + providerId);
            return false;
        }

        return true;
    }
}
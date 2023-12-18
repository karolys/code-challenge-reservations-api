const mysql = require('mysql2');

let conn;

module.exports = {
    retrieveAllAppointmentSlotsByProviderId: async () => {
        conn = await mysql.createConnection({
            host: process.env.dbHOST,
            user: process.env.dbUSER,
            password: process.env.dbPASSWORD,
            database: process.env.dbDATABASE,
        });

        // Need to ensure we are returning appointments that are 24 hours in the future only
        const sqlQuery = "select * from t_appointment_availability where reservation_id IS NULL AND appointment_start_time >= now() + INTERVAL 1 DAY;";
        const eligibleAvailableAppointmentsQueryResult =  await conn.promise().query(sqlQuery).catch( (err) => {
            console.log("Error getting appointments: " + err);
        });
        const appointmentsResultRows = eligibleAvailableAppointmentsQueryResult[0];

        // TODO: Need to properly error handle and also ensure empty case doesn't break anything
        return appointmentsResultRows;
    },
    updateAppointmentAvailabilityByProviderId: async (availabilityMap) => {
        //TODO: Iterate over Map of Dates, convert start and end times to a series of datetimes in 15 minute increments, generate MySQL Inserts and Insert into DB

    }
}
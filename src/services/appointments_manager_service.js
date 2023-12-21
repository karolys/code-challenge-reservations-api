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
    },
    reserveAppointmentSlotByAppointmentId: async (appointmentId, clientEmail) => {
        conn = await mysql.createConnection({
            host: process.env.dbHOST,
            user: process.env.dbUSER,
            password: process.env.dbPASSWORD,
            database: process.env.dbDATABASE,
        });

        // Check if appointmentId has a reservation_id set
        // If yes, kick back as this appointment is not available
        // If no, check if it has unconfirmed appointment id, if yes, check datetime of creation
        // - If greater than 30 minutes delete, update appointment record, and create new entry
        // - If not greater than 30 minutes reject appointment and return failure status
        // If no unconfirmed appointment id, insert data into t_unconfirmed_appointments table

        let reservationObj = { "status": false }

        // TODO: Update SQL query to ensure appointment time is 24 hours in advance or greater
        const sqlQuery = `select * from t_appointment_availability where appointment_id = ${appointmentId} AND appointment_start_time >= now() + INTERVAL 1 DAY;`;
        const appointmentForAppointmentIdQueryResult =  await conn.promise().query(sqlQuery).catch( (err) => {
            console.log(`Error getting appointment for Appointment ID: ${appointmentId} - `  + err);
        });
        const appointmentsResultRows = appointmentForAppointmentIdQueryResult[0];

        if (appointmentsResultRows && appointmentsResultRows.length === 0) {
            reservationObj.unconfirmedAppointmentId = -1;
            reservationObj.status = "failed: Appointment ID is unavailable";

            return reservationObj;
        }

        const targetAppointment = appointmentsResultRows[0];
        let unconfirmedAppointmentInsertRows;

        if (targetAppointment.reservation_id === null) {

            if (targetAppointment.unconfirmed_appointment_id === null) {
                // No reservations, create an unconfirmed appointment
                let unconfirmedAppointmentId = await createNewUnconfirmedAppointment(conn, appointmentId, clientEmail);
                // As we'd likely just generate a GUID or some other identifying code to then send via email to the user to confirm their appointment

                reservationObj.unconfirmedAppointmentId = unconfirmedAppointmentId;
                reservationObj.status = "reserved";
            } else {

                const isValidUnconfirmedAppointment = checkValidUnconfirmedAppointment(conn, targetAppointment.unconfirmed_appointment_id);

                if (isValidUnconfirmedAppointment) {
                    reservationObj.unconfirmedAppointmentId = -1;
                    reservationObj.status = "failed: Appointment ID is unavailable";
                } else {
                    // Delete Old Appointment
                    // Create New Entry for Appointment ID
                    // Update appointment id's unconfirmed appointment ID with new ID

                    const deleteOldUnconfirmedApptQuery = `DELETE FROM t_unconfirmed_appointments WHERE unconfirmed_appointment_id=${targetAppointment.unconfirmed_appointment_id};`;
                    const deleteOldUnconfirmedApptQueryResult = await conn.promise().query(deleteOldUnconfirmedApptQuery).catch( (err) => {
                        console.log(`Error deleting unconfirmed appointment for Unconfirmed Appointment ID: ${targetAppointment.unconfirmed_appointment_id} - ` + err);
                    });

                    let unconfirmedApptId = await createNewUnconfirmedAppointment(conn, appointmentId, clientEmail);

                    reservationObj.unconfirmedAppointmentId = unconfirmedApptId;
                    reservationObj.status = "reserved";
                }
            }


        } else {
            reservationObj.unconfirmedAppointmentId = -1;
            reservationObj.status = "failed: Appointment ID already booked";
        }

        // Should just be able to grab the first result here and check the fields per the guides above and branch as needed
        // console.log(appointmentsResultRows);
        // console.log(unconfirmedAppointmentInsertRows);

        return reservationObj;
    },
    confirmAppointmentSlotByAppointmentId: async (unconfirmedApptId) => {
        conn = await mysql.createConnection({
            host: process.env.dbHOST,
            user: process.env.dbUSER,
            password: process.env.dbPASSWORD,
            database: process.env.dbDATABASE,
        });

        let unconfirmedApptObject = await getAndCheckValidUnconfirmedAppointment(conn, unconfirmedApptId);

        if (unconfirmedApptObject.hasOwnProperty("isValid") && unconfirmedApptObject.isValid) {
            // Base case, clean up t_unconfirmed_appointments, and update t_appointment_slots
            await deleteUnconfirmedAppointment(conn, unconfirmedApptId);

            const insertNewConfirmedReservation = `INSERT INTO t_reservations(appointment_id,client_email) 
                                                        VALUES (${unconfirmedApptObject.appointmentId},"${unconfirmedApptObject.clientEmail}");`;
            const insertNewConfirmedReservationQueryResult = await conn.promise().query(insertNewConfirmedReservation).catch( (err) => {
                console.log(`Error creating new confirmed reservation for Unconfirmed Appointment ID: ${unconfirmedApptId} - ` + err);
            });

            let newReservationInsertRows = insertNewConfirmedReservationQueryResult[0];
            let newReservationId = newReservationInsertRows.insertId;

            const updateAppointmentSlotQuery = `UPDATE t_appointment_availability SET reservation_id = ${newReservationId}, unconfirmed_appointment_id = NULL WHERE appointment_id = ${unconfirmedApptObject.appointmentId};`;
            const updateAppointmentSlotQueryResult = await conn.promise().query(updateAppointmentSlotQuery).catch( (err) => {
                console.log(`Error updating appointment slot with reservation ID for Appointment ID: ${unconfirmedApptObject.appointmentId} - ` + err);
            });

            return true;
        } else {
            // Clean up t_unconfirmed_appointments, and t_appointment_slots and fail gracefully
            await deleteUnconfirmedAppointment(conn, unconfirmedApptId);

            const updateAppointmentSlotQuery = `UPDATE t_appointment_availability SET unconfirmed_appointment_id = NULL WHERE unconfirmed_appointment_id = ${unconfirmedApptId};`;
            const updateAppointmentSlotQueryResult = await conn.promise().query(updateAppointmentSlotQuery).catch( (err) => {
                console.log(`Error updating Appointment Slot for Unconfirmed Appointment ID: ${unconfirmedApptId} - ` + err);
            });

            return false;
        }
    }
}

const getAndCheckValidUnconfirmedAppointment = async (conn, unconfirmedAppointmentId) => {
    // Select Unconfirmed Appointment ID, if not found ensure not in appointment slots
    // If found, delete from Appointment Slot Column and remove entry from t_unconfirmed_appointments

    const sqlQuery = `select * from t_unconfirmed_appointments where unconfirmed_appointment_id = ${unconfirmedAppointmentId};`;
    const getUnconfirmedAppointmentQueryResult = await conn.promise().query(sqlQuery).catch( (err) => {
        console.log(`Error getting unconfirmed appointment for Unconfirmed Appointment ID: ${unconfirmedAppointmentId} - ` + err);
    });

    const unconfirmedAppointmentResultRows = getUnconfirmedAppointmentQueryResult[0];
    const unconfirmedApt = unconfirmedAppointmentResultRows[0];
    const aptCreatedDateTime = new Date(unconfirmedApt.appointment_created_datetime);
    const validAptCutoffDateTime = new Date(aptCreatedDateTime.getTime() + (30 * 60 * 1000));

    const unconfirmedAppointmentObject = {
        "isValid": false,
        "appointmentId": unconfirmedApt.appointment_id,
        "clientEmail": unconfirmedApt.client_email
    };

    if (validAptCutoffDateTime < Date.now()) {
        // Perhaps we should also remove in this case
        return unconfirmedAppointmentObject;
    }

    unconfirmedAppointmentObject.isValid = true;
    return unconfirmedAppointmentObject;
};

const deleteUnconfirmedAppointment = async (conn, unconfirmedAppointmentId) => {

    const deleteOldUnconfirmedApptQuery = `DELETE FROM t_unconfirmed_appointments WHERE unconfirmed_appointment_id=${unconfirmedAppointmentId};`;
    const deleteOldUnconfirmedApptQueryResult = await conn.promise().query(deleteOldUnconfirmedApptQuery).catch( (err) => {
        console.log(`Error deleting unconfirmed appointment for Unconfirmed Appointment ID: ${unconfirmedAppointmentId} - ` + err);
    });
};

const createNewUnconfirmedAppointment = async (conn, appointmentId, clientEmail) => {

    const insertNewAppointmentSqlQuery = `INSERT INTO t_unconfirmed_appointments (appointment_id,client_email,appointment_created_datetime) 
                                    VALUES (${appointmentId}, "${clientEmail}", now());`;
    const insertUnconfirmedAppointmentResult = await conn.promise().query(insertNewAppointmentSqlQuery);

    let unconfirmedAppointmentInsertRows = insertUnconfirmedAppointmentResult[0];
    let unconfirmedAppointmentId = unconfirmedAppointmentInsertRows.insertId;

    const updateAppointmentSlotQuery = `UPDATE t_appointment_availability SET unconfirmed_appointment_id = ${unconfirmedAppointmentId} WHERE appointment_id = ${appointmentId};`;
    const updateAppointmentSlotResult = await conn.promise().query(updateAppointmentSlotQuery);

    return unconfirmedAppointmentId;
};
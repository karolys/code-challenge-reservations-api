drop table if exists t_appointment_availability;
create table t_appointment_availability (
    appointment_id                  INT             AUTO_INCREMENT PRIMARY KEY,
    provider_id                     INT             UNIQUE NOT NULL,
    reservation_id                  INT             UNIQUE DEFAULT NULL,
    appointment_start_time          DATETIME        DEFAULT NULL
);

drop table if exists t_unconfirmed_appointments;
create table t_unconfirmed_appointments (
    unconfirmed_appointment_id          INT             AUTO_INCREMENT PRIMARY KEY,
    client_email                        VARCHAR(50)     DEFAULT NULL,
    appointment_created_datetime        DATETIME        DEFAULT NULL
);

drop table if exists t_reservations;
create table t_reservations (
    reservation_id                  INT             AUTO_INCREMENT PRIMARY KEY,
    appointment_id                  INT             UNIQUE NOT NULL,
    client_email                    VARCHAR(50)     DEFAULT NULL,
);
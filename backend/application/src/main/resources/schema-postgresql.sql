create table if not exists extensions
(
    name    varchar(255) not null,
    data    bytea,
    version bigint,
    primary key (name)
);

create table if not exists footprints
(
    id          bigserial primary key,
    lat         double precision not null,
    lng         double precision not null,
    trip_name   varchar(255),
    post_url    varchar(255),
    title       varchar(255),
    excerpt     text,
    thumbnail   varchar(255),
    date_str    varchar(50),
    create_time timestamp default current_timestamp
);

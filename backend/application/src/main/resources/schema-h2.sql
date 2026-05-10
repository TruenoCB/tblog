create table if not exists extensions
(
    name    varchar(255) not null,
    data    blob,
    version bigint,
    primary key (name)
);

create table if not exists footprints
(
    id          bigint auto_increment primary key,
    lat         double not null,
    lng         double not null,
    trip_name   varchar(255),
    post_url    varchar(255),
    title       varchar(255),
    excerpt     text,
    thumbnail   varchar(255),
    date_str    varchar(50),
    create_time timestamp default current_timestamp
);

create table if not exists category
(
    id integer not null  primary key,
    description varchar(255),
    name varchar(255)
);

create table if not exists nutrients
(
    id integer not null  primary key,
    proteins double precision,
    carbohydrates double precision,
    fats double precision

);
create table if not exists meal
(
    id integer not null  primary key,
    description varchar(255),
    name varchar(255),
    nutrients_id integer
        constraint foreignkey_nutrients references nutrients
);

create table if not exists food_item
(
    id integer not null  primary key,
    name varchar(255),
    quantity double precision,
    calories double precision,
    description varchar(255),
    nutrients_id integer constraint fk_nutrients references nutrients,
    category_id integer
    constraint foreignkey_category references category,
    meal_id integer
    constraint fk_meal references meal
    );

create sequence if not exists  category_seq increment by 50;
create sequence if not exists  nutrients_seq increment by 50;
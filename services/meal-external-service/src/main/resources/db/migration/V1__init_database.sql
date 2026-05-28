create extension if not exists "uuid-ossp";

create table if not exists category
(
    id UUID not null default uuid_generate_v4() primary key,
    description varchar(255),
    name varchar(255)
    );

create table if not exists nutrients
(
    id UUID not null default uuid_generate_v4() primary key,
    proteins double precision,
    carbohydrates double precision,
    fats double precision
);

create table if not exists meal
(
    id UUID not null default uuid_generate_v4() primary key,
    description varchar(255),
    name varchar(255)
    );

create table if not exists food_item
(
    id UUID not null default uuid_generate_v4() primary key,
    name varchar(255),
    quantity double precision,
    calories double precision,
    description varchar(255),
    nutrients_id UUID,
    category_id UUID,
    meal_id UUID,
    constraint fk_nutrients foreign key (nutrients_id) references nutrients(id),
    constraint fk_category foreign key (category_id) references category(id),
    constraint fk_meal foreign key (meal_id) references meal(id)
    );

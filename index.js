require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const filestack = require("filestack-js");
const axios = require("axios");

const width = 600; //px
const height = 600; //px
const backgroundColour = "white"; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour,
});

const prefix = "/";
const filestack_client = filestack.init("AJhmFi6TvTFel1yYFFcY0z");

const client = new Client({
    'intents': [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    'partials': [Partials.Channel],
});

let Myctx;


const InputCallBack = (ctx) => {
    let cmdData = ctx.content.split(" ");
    if (cmdData[0] === "/eth") {
        if (cmdData[1].slice(0, 2) === "0x") {
            searchCollection_collectionId(ctx, cmdData[1]);
        } else {
            searchCollection_collectionName(ctx, cmdData[1]);
        }
    } else if (cmdData[0] === "/sol") {
        let key = "";
        for (let index = 1; index < cmdData.length; index++) {
            if (index === cmdData.length - 1) {
                key = key + cmdData[index].toLowerCase();
            } else {
                key = key + cmdData[index].toLowerCase() + "-";
            }
        }
        searchCollection_solCollectionName(ctx, key);
    }
};

const searchCollection_collectionId = (ctx, key) => {
    const id = key;

    const options2 = {
        method: "GET",
        url: `https://api.reservoir.tools/collections/v5?id=${id}`,
        headers: {
            accept: "*/*",
            "x-api-key": "abb98582ec0343268a2fd47cfdf46036",
        },
    };

    axios
        .request(options2)
        .then(async (res2) => {
            let url = `https://api.reservoir.tools/events/collections/floor-ask/v1?collection=${id}&sortDirection=desc&limit=1000`;

            let data = await axios.get(url);

            let configuration = {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Floor Price",
                            data: [],
                            fill: false,
                            borderColor: "rgb(75, 192, 192)",
                            tension: 0.5,
                            pointStyle: false,
                        },
                    ],
                },
            };

            let PriceData = data.data.events;
            configuration.data.datasets[0].data.push(PriceData[0].floorAsk.price);
            configuration.data.labels = [];
            let curDate = new Date().getDate();

            PriceData.forEach((element) => {
                if (configuration.data.datasets[0].data.length < 7) {
                    if (new Date(element.event.createdAt).getDate() < curDate) {
                        let diff = curDate - new Date(element.event.createdAt).getDate();
                        for (let index = 0; index < diff; index++) {
                            configuration.data.datasets[0].data.push(element.floorAsk.price);
                        }
                        curDate = new Date(element.event.createdAt).getDate();
                    }
                }
            });

            configuration.data.datasets[0].data.reverse();

            // -------------------------------------

            curDate = new Date().valueOf();

            for (let index = 0; index < 7; index++) {
                const DateNum =
                    String(new Date(curDate - 24 * 60 * 60 * 1000 * (6 - index))).split(
                        " "
                    )[1] +
                    "-" +
                    new Date(curDate - 24 * 60 * 60 * 1000 * (6 - index)).getDate();

                configuration.data.labels.push(DateNum);
            }

            const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
            const base64Image = dataUrl;

            var base64Data = base64Image.replace(/^data:image\/png;base64,/, "");

            fs.writeFileSync(`out.png`, base64Data, "base64", function (err) {
                if (err) {
                    console.log(err);
                }
            });

            const image_file = fs.readFileSync(`out.png`);

            filestack_client
                .upload(image_file)
                .then(async (res) => {
                    const price =
                        res2.data.collections[0].floorAsk.price.amount.native.toFixed(4);
                    const floorChange1day =
                        configuration.data.datasets[0].data[6] >=
                            configuration.data.datasets[0].data[5]
                            ? "+" +
                            (
                                (configuration.data.datasets[0].data[6] /
                                    configuration.data.datasets[0].data[5]) *
                                100 -
                                100
                            ).toFixed(2)
                            : "-" +
                            (
                                100 -
                                (configuration.data.datasets[0].data[6] /
                                    configuration.data.datasets[0].data[5]) *
                                100
                            ).toFixed(2);

                    const floorChange7day =
                        configuration.data.datasets[0].data[6] >=
                            configuration.data.datasets[0].data[0]
                            ? "+" +
                            (
                                (configuration.data.datasets[0].data[6] /
                                    configuration.data.datasets[0].data[0] -
                                    1) *
                                100
                            ).toFixed(2)
                            : "-" +
                            (
                                100 -
                                (configuration.data.datasets[0].data[6] /
                                    configuration.data.datasets[0].data[0]) *
                                100
                            ).toFixed(2);

                    const floorChange30day =
                        res2.data.collections[0].floorSaleChange["30day"] >= 1
                            ? "+" +
                            (
                                (res2.data.collections[0].floorSaleChange["30day"] - 1) *
                                100
                            ).toFixed(2)
                            : "-" +
                            (
                                (1 - res2.data.collections[0].floorSaleChange["30day"]) *
                                100
                            ).toFixed(2);

                    const totalVolume =
                        res2.data.collections[0].volume.allTime.toFixed(4);

                    const listed =
                        (Number(res2.data.collections[0].onSaleCount) /
                            Number(res2.data.collections[0].tokenCount)) *
                        100;

                    const options_owner = {
                        method: "GET",
                        headers: { "X-API-KEY": "abb98582ec0343268a2fd47cfdf46036" },
                        url: `https://api.opensea.io/api/v1/collection/${res2.data.collections[0].slug}`,
                    };

                    let owner_data = await axios.request(options_owner);
                    const uniqueHolder = owner_data.data.collection.stats.num_owners;

                    const collectionId = res2.data.collections[0].id;
                    const collectionName = res2.data.collections[0].name;
                    const collectionSlug = res2.data.collections[0].slug;

                    const collectionOpenseaUrl = `https://opensea.io/collection/${collectionSlug}`;
                    const collectionEtherscanUrl = `https://etherscan.io/token/${collectionId}`;

                    let captionText = `\n🌄 _${collectionName}_\n_${collectionId}_\n\n⚡️ *Network: ETHEREUM*\n\n💰 *Price*: ${price} eth\n📉 *Floor Change*:\n🗓 *1 Day*: ${floorChange1day}%\n🗓 *7 Day*: ${floorChange7day}%\n🗓 *30 Day*: ${floorChange30day}%\n📈 *Total Volume*: ${totalVolume} eth\n💎 *Unique Holders*: ${uniqueHolder}\n💎 *Listed*: ${listed.toFixed(
                        2
                    )} %\n\nCollection Links:`;
                    captionText = captionText.replace(/\./g, "\\.");
                    captionText = captionText.replace(/\+/g, "\\+");
                    captionText = captionText.replace(/\-/g, "\\-");
                    captionText = captionText.replace(/\|/g, "\\|");

                    ctx.channel.send(res.url);
                    ctx.channel.send(captionText);
                    const Opensea = new EmbedBuilder().setColor(0x0099FF).setTitle('Opensea').setURL(collectionOpenseaUrl).setDescription('Click here for go to Opensea!');
                    const Ethereum = new EmbedBuilder().setColor(0x0099FF).setTitle('Ethereum').setURL(collectionEtherscanUrl).setDescription('Click here for go to Ethereum!');
                    ctx.channel.send({ embeds: [Opensea, Ethereum] });
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.error(err);
            Myctx.reply("Can`t find this collection");
        });
};

const searchCollection_collectionName = async (ctx, msg) => {
    const collectionName = msg;
    const options = {
        method: "GET",
        url: `https://api.reservoir.tools/search/collections/v1?name=${collectionName}&limit=1`,
        headers: { accept: "*/*", "x-api-key": "abb98582ec0343268a2fd47cfdf46036" },
    };

    axios
        .request(options)
        .then((response) => {
            const options2 = {
                method: "GET",
                url: `https://api.reservoir.tools/collections/v5?id=${response.data.collections[0].collectionId}`,
                headers: {
                    accept: "*/*",
                    "x-api-key": "abb98582ec0343268a2fd47cfdf46036",
                },
            };

            axios
                .request(options2)
                .then(async (res2) => {
                    let url = `https://api.reservoir.tools/events/collections/floor-ask/v1?collection=${response.data.collections[0].collectionId}&sortDirection=desc&limit=1000`;

                    let data = await axios.get(url);

                    let configuration = {
                        type: "line",
                        data: {
                            labels: [],
                            datasets: [
                                {
                                    label: "Floor Price",
                                    data: [],
                                    fill: false,
                                    borderColor: "rgb(75, 192, 192)",
                                    tension: 0.5,
                                    pointStyle: false,
                                },
                            ],
                        },
                    };

                    let PriceData = data.data.events;
                    configuration.data.datasets[0].data.push(PriceData[0].floorAsk.price);
                    configuration.data.labels = [];
                    let curDate = new Date().getDate();

                    PriceData.forEach((element) => {
                        if (configuration.data.datasets[0].data.length < 7) {
                            if (new Date(element.event.createdAt).getDate() < curDate) {
                                let diff =
                                    curDate - new Date(element.event.createdAt).getDate();
                                for (let index = 0; index < diff; index++) {
                                    configuration.data.datasets[0].data.push(
                                        element.floorAsk.price
                                    );
                                }
                                curDate = new Date(element.event.createdAt).getDate();
                            }
                        }
                    });

                    configuration.data.datasets[0].data.reverse();

                    // -------------------------------------

                    curDate = new Date().valueOf();

                    for (let index = 0; index < 7; index++) {
                        const DateNum =
                            String(
                                new Date(curDate - 24 * 60 * 60 * 1000 * (6 - index))
                            ).split(" ")[1] +
                            "-" +
                            new Date(curDate - 24 * 60 * 60 * 1000 * (6 - index)).getDate();

                        configuration.data.labels.push(DateNum);
                    }

                    const dataUrl = await chartJSNodeCanvas.renderToDataURL(
                        configuration
                    );
                    const base64Image = dataUrl;

                    var base64Data = base64Image.replace(/^data:image\/png;base64,/, "");

                    fs.writeFileSync(`out.png`, base64Data, "base64", function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    const image_file = fs.readFileSync(`out.png`);

                    filestack_client
                        .upload(image_file)
                        .then(async (res) => {
                            const price =
                                res2.data.collections[0].floorAsk.price.amount.native.toFixed(
                                    4
                                );
                            const floorChange1day =
                                configuration.data.datasets[0].data[6] >=
                                    configuration.data.datasets[0].data[5]
                                    ? "+" +
                                    (
                                        (configuration.data.datasets[0].data[6] /
                                            configuration.data.datasets[0].data[5]) *
                                        100 -
                                        100
                                    ).toFixed(2)
                                    : "-" +
                                    (
                                        100 -
                                        (configuration.data.datasets[0].data[6] /
                                            configuration.data.datasets[0].data[5]) *
                                        100
                                    ).toFixed(2);

                            const floorChange7day =
                                configuration.data.datasets[0].data[6] >=
                                    configuration.data.datasets[0].data[0]
                                    ? "+" +
                                    (
                                        (configuration.data.datasets[0].data[6] /
                                            configuration.data.datasets[0].data[0] -
                                            1) *
                                        100
                                    ).toFixed(2)
                                    : "-" +
                                    (
                                        100 -
                                        (configuration.data.datasets[0].data[6] /
                                            configuration.data.datasets[0].data[0]) *
                                        100
                                    ).toFixed(2);

                            const floorChange30day =
                                res2.data.collections[0].floorSaleChange["30day"] >= 1
                                    ? "+" +
                                    (
                                        (res2.data.collections[0].floorSaleChange["30day"] - 1) *
                                        100
                                    ).toFixed(2)
                                    : "-" +
                                    (
                                        (1 - res2.data.collections[0].floorSaleChange["30day"]) *
                                        100
                                    ).toFixed(2);

                            const totalVolume =
                                res2.data.collections[0].volume.allTime.toFixed(4);

                            const listed =
                                (Number(res2.data.collections[0].onSaleCount) /
                                    Number(res2.data.collections[0].tokenCount)) *
                                100;

                            const options_owner = {
                                method: "GET",
                                headers: { "X-API-KEY": "abb98582ec0343268a2fd47cfdf46036" },
                                url: `https://api.opensea.io/api/v1/collection/${res2.data.collections[0].slug}`,
                            };

                            let owner_data = await axios.request(options_owner);
                            const uniqueHolder = owner_data.data.collection.stats.num_owners;

                            const collectionId = res2.data.collections[0].id;
                            const collectionName = res2.data.collections[0].name;
                            const collectionSlug = res2.data.collections[0].slug;

                            const collectionOpenseaUrl = `https://opensea.io/collection/${collectionSlug}`;
                            const collectionEtherscanUrl = `https://etherscan.io/token/${collectionId}`;

                            let captionText = `\n🌄 _${collectionName}_\n_${collectionId}_\n\n⚡️ *Network: ETHEREUM*\n\n💰 *Price*: ${price} eth\n📉 *Floor Change*:\n🗓 *1 Day*: ${floorChange1day}%\n🗓 *7 Day*: ${floorChange7day}%\n🗓 *30 Day*: ${floorChange30day}%\n📈 *Total Volume*: ${totalVolume} eth\n💎 *Unique Holders*: ${uniqueHolder}\n💎 *Listed*: ${listed.toFixed(
                                2
                            )} %\n\nCollection Links:`;
                            captionText = captionText.replace(/\./g, "\\.");
                            captionText = captionText.replace(/\+/g, "\\+");
                            captionText = captionText.replace(/\-/g, "\\-");
                            captionText = captionText.replace(/\|/g, "\\|");

                            ctx.channel.send(res.url);
                            ctx.channel.send(captionText);

                            const Opensea = new EmbedBuilder().setColor(0x0099FF).setTitle('Opensea').setURL(collectionOpenseaUrl).setDescription('Click here for go to Opensea!');
                            const Ethereum = new EmbedBuilder().setColor(0x0099FF).setTitle('Ethereum').setURL(collectionEtherscanUrl).setDescription('Click here for go to Ethereum!');
                            ctx.channel.send({ embeds: [Opensea, Ethereum] });
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                })
                .catch((err) => {
                    console.error(err);
                    Myctx.reply("Can`t find this collection");
                });
        })
        .catch((err) => {
            console.error(err);
            Myctx.reply("Can`t find this collection");
        });
};

const searchCollection_solCollectionName = async (ctx, msg) => {
    axios
        .get(`https://cloudflare-worker-nft.solswatch.workers.dev/slug/${msg}`)
        .then(async (res_sol_collection) => {
            let url = `https://cloudflare-worker-nft.solswatch.workers.dev/chart-data/30/${msg}`;

            let data = await axios.get(url);
            data = data.data[0];

            let configuration = {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Floor Price",
                            data: [],
                            fill: false,
                            borderColor: "rgb(75, 192, 192)",
                            tension: 0.5,
                            pointStyle: false,
                        },
                    ],
                },
            };

            configuration.data.datasets[0].data = [];
            configuration.data.labels = [];

            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                const DateNum =
                    String(
                        new Date(new Date(element.date).valueOf() - 24 * 60 * 60 * 1000)
                    ).split(" ")[1] +
                    "-" +
                    new Date(
                        new Date(element.date).valueOf() - 24 * 60 * 60 * 1000
                    ).getDate();
                configuration.data.labels.push(DateNum);
                configuration.data.datasets[0].data.push(
                    Number(element.me_floor_price)
                );
            }

            const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
            const base64Image = dataUrl;

            var base64Data = base64Image.replace(/^data:image\/png;base64,/, "");

            fs.writeFileSync(`out.png`, base64Data, "base64", function (err) {
                if (err) {
                    console.log(err);
                }
            });

            const image_file = fs.readFileSync(`out.png`);

            filestack_client
                .upload(image_file)
                .then(async (res) => {
                    let captionText = `\n🌄 _${res_sol_collection.data[0].name
                        }_\n\n⚡️ *Network: Solana*\n\n💰 *Price*: ${res_sol_collection.data[0].floor_price.toFixed(
                            2
                        )} sol\n📉 *Floor Change*:\n🗓 *1 Day*: ${res_sol_collection.data[0].daily_floor.toFixed(
                            2
                        )}%\n🗓 *7 Day*: ${res_sol_collection.data[0].weekly_floor.toFixed(
                            2
                        )}%\n🗓 *30 Day*: ${res_sol_collection.data[0].monthly_floor.toFixed(
                            2
                        )}%\n📈 *Total Volume*: ${res_sol_collection.data[0].me_total_volume.toFixed(
                            2
                        )} sol\n💎 *Total Supply*: ${res_sol_collection.data[0].total_items
                        }\n💎 *Listed*: ${res_sol_collection.data[0].me_listed_count
                        }\n\nCollection Links:`;
                    captionText = captionText.replace(/\./g, "\\.");
                    captionText = captionText.replace(/\+/g, "\\+");
                    captionText = captionText.replace(/\-/g, "\\-");
                    captionText = captionText.replace(/\|/g, "\\|");

                    ctx.channel.send(res.url);
                    ctx.channel.send(captionText);
                    const collectionSolUrl = `https://magiceden.io/marketplace/${res_sol_collection.data[0].magiceden}`;
                    const Sol = new EmbedBuilder().setColor(0x0099FF).setTitle("MagicEden").setURL(collectionSolUrl).setDescription('Click here for go to Magiceden!');
                    ctx.channel.send({ embeds: [Sol] });
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.error(err);
            Myctx.reply("Can`t find this collection");
        });
};

client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith(prefix)) return;

    const commandBody = msg.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "start") {
        msg.channel.send("Please use the /eth or /sol command to receive a new nft");
        Myctx = command;
    }

    InputCallBack(msg);
});

client.login(process.env.CLIENT_TOKEN)
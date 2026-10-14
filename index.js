const { token } = require("./config.json");
const { Client, Events, SlashCommandBuilder } = require("discord.js");

const client = new Client({ intents: [] });
const database = [];

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    const lb = new SlashCommandBuilder().setName("lb").setDescription("Fetches leaderboard from Slippi.gg");
    const add = new SlashCommandBuilder().setName("add").setDescription("Input a Slippi.gg user code to add them to the leaderboard").addStringOption((option) => option.setName("code").setDescription("The user code (a few letters, a hashtag, then a few numbers; ex. HBOX#305)").setRequired(true));
    const dblist = new SlashCommandBuilder().setName("dblist").setDescription("List all of the Slippi.gg codes in the database");
    const remove = new SlashCommandBuilder().setName("remove").setDescription("Remove someone from the leaderboard").addStringOption((option) => option.setName("code").setDescription("The removee's code, as listed in the database/leaderboard").setRequired(true));

    client.application.commands.create(lb);
    client.application.commands.create(add);
    client.application.commands.create(dblist);
    client.application.commands.create(remove);
});

client.on(Events.InteractionCreate, interaction => {
    let response;

    switch (interaction.commandName) {
        case "lb":
            if (database.length === 0) {
                interaction.reply("I can't make a leaderboard! There are no names in the database :O");
                break;
            };
            let arr = [];
            database.forEach((v, search) => {
                let name, ranking;
                fetch("https://internal.slippi.gg/graphql", {
                    method: "POST",
                    headers: {
                        "Accept":"*/*",
                        "Content-Type":"application/json"
                    },
                    body: JSON.stringify({operationName:"UserProfilePageQuery",variables:{cc:v,uid:v},query:`fragment profileFields on NetplayProfile {\n  id\n  ratingOrdinal\n  ratingUpdateCount\n  wins\n  losses\n  dailyGlobalPlacement\n  dailyRegionalPlacement\n  continent\n  characters {\n    character\n    gameCount\n    __typename\n  }\n  __typename\n}\n\nfragment userProfilePage on User {\n  fbUid\n  displayName\n  connectCode {\n    code\n    __typename\n  }\n  status\n  suspensionExpiration\n  activeSubscription {\n    level\n    hasGiftSub\n    __typename\n  }\n  rankedNetplayProfile {\n    ...profileFields\n    __typename\n  }\n  rankedNetplayProfileHistory {\n    ...profileFields\n    season {\n      id\n      startedAt\n      endedAt\n      name\n      status\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nquery UserProfilePageQuery($cc: String, $uid: String) {\n  getUser(fbUid: $uid, connectCode: $cc) {\n    ...userProfilePage\n    __typename\n  }\n}\n`})
                })
                .then(response => {
                    if (!response.ok) {throw new Error("Network response was not okay")}
                    return response.json();
                })
                .then(data => {
                    name = data.data.getUser.displayName;
                    ranking = data.data.getUser.rankedNetplayProfile.ratingOrdinal.toFixed(2);

                    arr.push([name, v, Number(ranking)]);

                    if (arr.length === database.length) {respond()}
                })
                .catch(error => {
                    interaction.reply("Slippi ran into an issue! Couldn't find any data on a user with the code " + v + "\nIf necessary, use the /remove command to remove this user code");
                    console.error("Error: " + error);
                });
            });

            function respond() {
                response = "# ***LEADERBOARD***\n\n";
                let previous = -1;
                let final = [[0, 0, -1]];
                arr.forEach((v, i) => {if (v[2] > final[0][2]) {final[0] = v; previous = i}});
                while (final.length < arr.length) {
                    let next = [[0, 0, -1], -1];
                    arr.forEach((v, i) => {if (v[2] > next[0][2] && v[2] <= final[final.length - 1][2] && i != previous) {next = [v, i]}});
                    final.push(next[0]);
                    previous = next[1];
                }

                let ties = 1;
                final.forEach((v, i) => {
                    if (i != 0) {if (v[2] === final[i - 1][2]) {ties--}};
                    response += "\t**#" + (i + ties) + ": " + v[0] + "** (" + v[1] + ")\t-\t" + v[2] + " Rating\n\n";
                });

                interaction.reply(response);
            };
            break;
        case "add":
            let code = interaction.options.getString('code').toUpperCase();
            if (code.match("#").length === 1 && code.indexOf(" ") === -1) {
                database.push(code);
                interaction.reply("Successfully added " + code + " to the database!");
            } else {
                interaction.reply("Could not accept the given code D:\nIt could be that the requested code included spaces, or lacked the required # symbol");
            }
            break;
        case "dblist":
            response = "***Current Database:***\n";
            database.forEach((v) => {response += "\t\\- " + v + "\n"});
            if (database.length === 0) {response += "\tEmpty D:"};
            interaction.reply(response);
            break;
        case "remove":
            let code2 = interaction.options.getString('code').toUpperCase();
            let n = database.indexOf(code2);
            if (n != -1) {
                database.splice(n, 1);
                interaction.reply("Successfully removed " + code2 + " from the database!");
            } else {
                interaction.reply("Slippi couldn't find a matching code in the database :/\n Use /dblist to check all the codes in the database")
            }
            break;
        default:
            interaction.reply("Slippi doesn't recognize that command :/");
            break;
    };
})

client.login(token);

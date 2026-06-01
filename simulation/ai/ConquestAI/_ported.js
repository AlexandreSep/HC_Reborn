import { EconomyManager } from "simulation/ai/ConquestAI/economyManager.js";
import { ConstructionManager } from "simulation/ai/ConquestAI/constructionManager.js";
import { postChooseHero } from "simulation/ai/ConquestAI/commands.js";
import { MilitaryManager } from "simulation/ai/ConquestAI/militaryManager.js";
import { ResearchManager } from "simulation/ai/ConquestAI/researchManager.js";

if (typeof globalThis.PlayerID === "undefined")
	globalThis.PlayerID = -1;

export function ConquestAIBot(settings)
{
	this.player = settings.player;
	this.turn = 0;
	this.playedTurn = 0;
	this.elapsedTime = 0;
	this.savedEvents = {};
	this.heroChosen = false;
	this.economyManager = new EconomyManager();
	this.constructionManager = new ConstructionManager();
	this.militaryManager = new MilitaryManager();
	this.researchManager = new ResearchManager();
	this.HQ = {
		"economyManager": this.economyManager,
		"constructionManager": this.constructionManager,
		"militaryManager": this.militaryManager,
		"researchManager": this.researchManager
	};
}

ConquestAIBot.prototype.Serialize = function()
{
	return {
		"turn": this.turn,
		"playedTurn": this.playedTurn,
		"elapsedTime": this.elapsedTime,
		"savedEvents": this.savedEvents,
		"heroChosen": this.heroChosen,
		"economy": this.economyManager.Serialize(),
		"construction": this.constructionManager.Serialize(),
		"military": this.militaryManager.Serialize(),
		"research": this.researchManager.Serialize()
	};
};

ConquestAIBot.prototype.Deserialize = function(data)
{
	this.turn = data.turn || 0;
	this.playedTurn = data.playedTurn || 0;
	this.elapsedTime = data.elapsedTime || 0;
	this.savedEvents = data.savedEvents || {};
	this.heroChosen = !!data.heroChosen;
	this.economyManager = new EconomyManager(data.economy);
	this.constructionManager = new ConstructionManager(data.construction);
	this.militaryManager = new MilitaryManager(data.military);
	this.researchManager = new ResearchManager(data.research);
	this.HQ = {
		"economyManager": this.economyManager,
		"constructionManager": this.constructionManager,
		"militaryManager": this.militaryManager,
		"researchManager": this.researchManager
	};
};

ConquestAIBot.prototype.setSharedState = function(playerID, sharedAI)
{
	this.player = playerID;
	this.sharedAI = sharedAI;
	globalThis.PlayerID = playerID;

	if (!sharedAI || !sharedAI.gameState || !sharedAI.gameState[this.player])
	{
		this.gameState = undefined;
		if (!this.warnedMissingSharedAI)
		{
			warn("[HC_PORTED_AI] sharedAI unavailable; ConquestAI port will stay idle until common-api loads correctly.");
			this.warnedMissingSharedAI = true;
		}
		return false;
	}

	this.events = sharedAI.events || {};
	this.territoryMap = sharedAI.territoryMap;
	this.gameState = sharedAI.gameState[this.player];
	this.gameState.ai = this;
	return true;
};

ConquestAIBot.prototype.Init = function(state, playerID, sharedAI)
{
	this.setSharedState(playerID, sharedAI);
};

ConquestAIBot.prototype.HandleMessage = function(state, playerID, sharedAI)
{
	if (!this.setSharedState(playerID, sharedAI))
		return;

	this.saveEvents();
	this.elapsedTime = this.gameState.getTimeElapsed ? this.gameState.getTimeElapsed() / 1000 : this.elapsedTime;
	this.chooseHeroIfNeeded();

	if (!this.playedTurn || (this.turn + this.player) % 8 == 5)
	{
		Engine.ProfileStart("ConquestAI ported bot (player " + this.player + ")");
		this.playedTurn++;

		if (this.gameState.getOwnEntities && this.gameState.getOwnEntities().hasEntities())
		{
			this.economyManager.update(this.gameState, this.player, this.elapsedTime);
			this.constructionManager.update(this.gameState, this.player, this.playedTurn, this.elapsedTime);
			this.researchManager.update(this.gameState, this.player, this.elapsedTime);
			this.militaryManager.update(this.gameState, this.player, this.elapsedTime, this.savedEvents);
		}

		this.clearSavedEvents();
		Engine.ProfileStop();
	}

	this.turn++;
};

ConquestAIBot.prototype.chooseHeroIfNeeded = function()
{
	if (this.heroChosen || !this.gameState)
		return;

	const civ = this.gameState.getPlayerCiv && this.gameState.getPlayerCiv();
	if (!civ)
		return;

	postChooseHero(this.player, civ);
	this.heroChosen = true;
};

ConquestAIBot.prototype.saveEvents = function()
{
	for (const type in this.events)
	{
		if (type == "AIMetadata")
			continue;

		if (this.savedEvents[type])
			this.savedEvents[type] = this.savedEvents[type].concat(this.events[type]);
		else
			this.savedEvents[type] = this.events[type];
	}
};

ConquestAIBot.prototype.clearSavedEvents = function()
{
	for (const type in this.savedEvents)
		this.savedEvents[type] = [];
};

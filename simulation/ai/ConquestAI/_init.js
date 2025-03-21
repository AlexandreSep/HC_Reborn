Engine.IncludeModule("common-api");

var CONQUESTAI = (function() {
var m = {};

m.ConquestAIBot = function ConquestAIBot(settings)
{
    // let stack = new Error().stack.trimRight().replace(/^/mg, '  '); useful for backtracking the callstack
	API3.BaseAI.call(this, settings);

	this.playedTurn = 0;
	this.elapsedTime = 0;

	this.uniqueIDs = {
		"armies": 1,	// starts at 1 to allow easier tests on armies ID existence
		"bases": 1,	// base manager ID starts at one because "0" means "no base" on the map
		"plans": 0,	// training/building/research plans
		"transports": 1	// transport plans start at 1 because 0 might be used as none
	};

	this.Config = new m.Config(settings.difficulty, settings.behavior);

	this.savedEvents = {};
};

m.ConquestAIBot.prototype = new API3.BaseAI();

m.ConquestAIBot.prototype.CustomInit = function(gameState)
{
	if (this.isDeserialized)
	{
		// WARNING: the deserializations should not modify the metadatas infos inside their init functions
		this.turn = this.data.turn;
		this.playedTurn = this.data.playedTurn;
		this.elapsedTime = this.data.elapsedTime;
		this.savedEvents = this.data.savedEvents;
		for (let key in this.savedEvents)
		{
			for (let i in this.savedEvents[key])
			{
				if (!this.savedEvents[key][i].entityObj)
					continue;
				let evt = this.savedEvents[key][i];
				let evtmod = {};
				for (let keyevt in evt)
				{
					evtmod[keyevt] = evt[keyevt];
					evtmod.entityObj = new API3.Entity(gameState.sharedScript, evt.entityObj);
					this.savedEvents[key][i] = evtmod;
				}
			}
		}

		this.Config.Deserialize(this.data.config);

		this.HQ = new m.HQ(this.Config);
		this.HQ.init(gameState);
		this.HQ.Deserialize(gameState, this.data.HQ);

		this.uniqueIDs = this.data.uniqueIDs;
		this.isDeserialized = false;
		this.data = undefined;

		// initialisation needed after the completion of the deserialization
		this.HQ.postinit(gameState);
	}
	else
	{
		this.Config.setConfig(gameState);

		this.HQ = new m.HQ(this.Config);

		this.HQ.init(gameState);

		// Analyze our starting position and set a strategy
		this.HQ.gameAnalysis(gameState);
	}
};

m.ConquestAIBot.prototype.OnUpdate = function(sharedScript)
{
	if (this.gameFinished)
		return;

	for (let i in this.events)
	{
		if (i == "AIMetadata")   // not used inside petra
			continue;
		if(this.savedEvents[i] !== undefined)
			this.savedEvents[i] = this.savedEvents[i].concat(this.events[i]);
		else
			this.savedEvents[i] = this.events[i];
	}

	// Run the update every n turns, offset depending on player ID to balance the load
	this.elapsedTime = this.gameState.getTimeElapsed() / 1000;
	if (!this.playedTurn || (this.turn + this.player) % 8 == 5)
	{
        Engine.ProfileStart("ConquestAI bot (player " + this.player +")");

		this.playedTurn++;

		if (this.gameState.getOwnEntities().length === 0)
		{
			Engine.ProfileStop();
			return; // With no entities to control the AI cannot do anything
		}

		this.HQ.update(this.gameState, this.savedEvents);

		for (let i in this.savedEvents)
			this.savedEvents[i] = [];

		Engine.ProfileStop();
	}

	this.turn++;
};

m.ConquestAIBot.prototype.Serialize = function()
{
	let savedEvents = {};
	for (let key in this.savedEvents)
	{
		savedEvents[key] = this.savedEvents[key].slice();
		for (let i in savedEvents[key])
		{
			if (!savedEvents[key][i].entityObj)
				continue;
			let evt = savedEvents[key][i];
			let evtmod = {};
			for (let keyevt in evt)
				evtmod[keyevt] = evt[keyevt];
			evtmod.entityObj = evt.entityObj._entity;
			savedEvents[key][i] = evtmod;
		}
	}

	return {
		"uniqueIDs": this.uniqueIDs,
		"turn": this.turn,
		"playedTurn": this.playedTurn,
		"elapsedTime": this.elapsedTime,
		"savedEvents": savedEvents,
		"config": this.Config.Serialize()
	};
};

m.ConquestAIBot.prototype.Deserialize = function(data, sharedScript)
{
	this.isDeserialized = true;
	this.data = data;
};

return m;
}());

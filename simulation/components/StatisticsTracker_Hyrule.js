StatisticsTracker.prototype.EnsureSequences = function()
{
	if (this.sequences)
		return;

	this.sequences = clone(this.GetStatistics());
	this.sequences.time = [];
};

StatisticsTracker.prototype.OnGlobalInitGame = function()
{
	this.EnsureSequences();
};

StatisticsTracker.prototype.GetSequences = function()
{
	this.EnsureSequences();

	const ret = clone(this.sequences);
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);

	ret.time.push(cmpTimer.GetTime() / 1000);
	this.PushValue(this.GetStatistics(), ret);
	return ret;
};

StatisticsTracker.prototype.UpdateSequences = function()
{
	this.EnsureSequences();

	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.sequences.time.push(cmpTimer.GetTime() / 1000);
	this.PushValue(this.GetStatistics(), this.sequences);
};

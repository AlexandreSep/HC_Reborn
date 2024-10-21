Attack.prototype.GetKnockback = function (type, isSplash)
{
    if (!isSplash)
    {
        let Knockback = this.template[type].Knockback;
        if (Knockback)
        {
            let horizontal = ApplyValueModificationsToEntity("Attack/" + type + "/Knockback/Horizontal", +Knockback.Horizontal, this.entity);

            let vertical = Knockback.Vertical;
            if (vertical)
                vertical = ApplyValueModificationsToEntity("Attack/" + type + "/Knockback/Vertical", +vertical, this.entity);

            return { "horizontal": horizontal, "vertical": vertical };
        }
    }
    else
    {
        let Knockback = this.template[type]["Splash"].Knockback;
        if (Knockback)
        {
            let horizontal = ApplyValueModificationsToEntity("Attack/" + type + "/Splash/Knockback/Horizontal", +Knockback.Horizontal, this.entity);

            let vertical = Knockback.Vertical;
            if (vertical)
                vertical = ApplyValueModificationsToEntity("Attack/" + type + "/Splash/Knockback/Vertical", +vertical, this.entity);

            return { "horizontal": horizontal, "vertical": vertical };
        }
    }

    return null;
}

Attack.prototype.GetStun = function (type, isSplash)
{
    if (!isSplash)
    {
        let Stun = this.template[type].Stun;
        if (Stun)
        {
            let time = ApplyValueModificationsToEntity("Attack/" + type + "/Stun/Time", +Stun.Time, this.entity);
            let chance = ApplyValueModificationsToEntity("Attack/" + type + "/Stun/Chance", +Stun.Chance, this.entity);
            return { "time": time, "chance": chance };
        }
    }
    else
    {
        let Stun = this.template[type]["Splash"].Stun;
        if (Stun)
        {
            let time = ApplyValueModificationsToEntity("Attack/" + type + "/Splash/Stun/Time", +Stun.Time, this.entity);
            let chance = ApplyValueModificationsToEntity("Attack/" + type + "/Splash/Stun/Chance", +Stun.Chance, this.entity);
            return { "time": time, "chance": chance };
        }
    }

    return null;
}

Attack.prototype.GetEntityOnImpact = function (type) {
    if (this.template[type].SpawnEntityOnImpact)
    {
        let numberMin = ApplyValueModificationsToEntity("Attack/"+ type +"/SpawnEntityOnImpact/SpawnNumberMin", +this.template[type].SpawnEntityOnImpact.SpawnNumberMin, this.entity);
        let numberMax = ApplyValueModificationsToEntity("Attack/"+ type +"/SpawnEntityOnImpact/SpawnNumberMax", +this.template[type].SpawnEntityOnImpact.SpawnNumberMax, this.entity);
        let object =
        {
            "template": this.template[type].SpawnEntityOnImpact.Template,
            "spawnNumberMin": numberMin,
            "spawnNumberMax": numberMax
        };

        let ownerID = this.template[type].SpawnEntityOnImpact.OwnerID;
        if (ownerID != undefined)
            object.ownerID = ownerID;

        if (this.template[type].SpawnEntityOnImpact.SpawnOnHit)
        {
            object["spawnOnHit"] = {};

            let chance = ApplyValueModificationsToEntity("Attack/"+ type +"/SpawnEntityOnImpact/SpawnOnHit/Chance", +this.template[type].SpawnEntityOnImpact.SpawnOnHit.Chance, this.entity);
            object["spawnOnHit"].chance = chance;
            object["spawnOnHit"].spawnAtTarget = this.template[type].SpawnEntityOnImpact.SpawnOnHit.SpawnAtTarget != "false";
        }

        if (this.template[type].SpawnEntityOnImpact.SpawnOnImpact)
        {
            object["spawnOnImpact"] = {};
            let chance = ApplyValueModificationsToEntity("Attack/"+ type +"/SpawnEntityOnImpact/SpawnOnHit/Chance", +this.template[type].SpawnEntityOnImpact.SpawnOnImpact.Chance, this.entity);
            object["spawnOnImpact"].chance = chance;
        }

        return object;
    }
    else
        return false;
};
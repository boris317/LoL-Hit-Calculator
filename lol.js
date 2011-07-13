var DefensePenetration = function(initObject){
	this.reduction = initObject['reduction'] || null;
	this.reductionPercent = initObject['reductionPercent'] || null;
	this.penetration = initObject['penetration'] || null;
	this.penetrationPercent = initObject['penetrationPercent'] || null; 
}

// DamageReduction Object: Represents both armor and magic resist.
var DamageReduction = function(amount, champion) {
	this.amount = amount;
	this.champion = champion || null;
}

DamageReduction.prototype.mitigate = function(damage, defensePenetration) {
    var amount = this.amount;
    if (defensePenetration != undefined) {
		if (defensePenetration.reductionPercent) {
			amount = amount - (amount * defensePenetration.reductionPercent);
		}
		if (defensePenetration.reduction) {
			amount = amount - defensePenetration.reduction;
		}		
		if (amount > 0 && defensePenetration.penetrationPercent) {
			amount = amount - (amount * defensePenetration.penetrationPercent);
			amount = amount < 0 ? 0 : amount;
		}		
		if (amount > 0 && defensePenetration.penetration) {
			amount = amount - defensePenetration.penetration;
			amount = amount < 0 ? 0 : amount;			
		}					
	}
 
    return damage * this.multiplier(amount);
}

DamageReduction.prototype.applyHit = function(hit) {
	// Accepts a Hit object instance and applies the damage. Returns
	// the final modified damage value after damage reduction has been
	// applied.
	return this.mitigate(hit.amount, hit.defensePenetration);
}

DamageReduction.prototype.multiplier = function(amount) {
	var amount = amount || this.amount;
	if (amount >= 0) {
    	return 100 / (100 + amount);
    } else if (amount < 0) {
    	return 1 + Math.abs(amount) / 100;
	}
}

DamageReduction.prototype.effectiveHealth = function(health) {
	var health = health || 0;
	if (this.champion) {
		health = this.champion.getStat("health");
	}
	if (health == 0){
		return 0;
	}
	if (this.amount >= 0) {
		return health * (100 + this.amount) / 100;
	} else if (this.amount) {
		return health * 100 / (100 + Math.abs(this.amount));
	}
}

// Hit Object: This object represents a single hit or strike to a target. Hits are used
// to calculate damage done to a target after armor, magic resists and defense penetration are 
// applied. Hits are applied to a ``DamageReduction`` object via the ``DamageReduction.applyHit`` method.

var Hit = function(amount, damageType, defensePenetration) {
	// @param damageType - Magic or physical.
	// @param amount - Amount of damage.
	// @param defensePenetration - DefensePenetration object.
	
	this.amount = amount;
	this.damageType = damageType;
	this.defensePenetration = defensePenetration;
}

// Champion Object: Simple object to represent a champion.
var Champion = function(champName){
	this.name = champName;
	this.baseStats = new Stats();
	// If you want to add additional stats from items use the statsFromItems property.
	this.statsFromItems = new Stats();	
	this._level = 0;
	
	this.armorFromItems = 0;
	this.magicResistFromItems = 0;
	this.healthFromItems = 0;
}
Champion.prototype.getStat = function(statName) {
	var stat = this.baseStats.get(statName, this._level) + this.statsFromItems.get(statName);
	if (statName == "armor" || statName == "magicResist") {
		return new DamageReduction(stat, this);
	}
	return stat;
}

Champion.prototype.level = function(){
	return this._level + 1;
}

Champion.prototype.setLevel = function(level) {
	if (!(level <= 18 && level >= 1)) {
		throw RangeError;
	}
	this._level = level - 1;
}

var perLevelRegex = /^([^\s]*)\s\(\+\s?([^\)]*)\)$/;
function parsePerLevelInc(value){
	var result = {
		value: parseFloat(value),
		perLevel:0
	};
	if (value == null || value == undefined) {
		return result;
	}
	m = value.match(perLevelRegex);
	if (!m) {
		return result
	} else {
		result.value = parseFloat(m[1]);
		result.perLevel = parseFloat(m[2]);
	}
	return result;
}

// championFactory creates Champion instances from champion stat objects in champs.js
function championFactory(champName, championObject){
	champion = new Champion(champName);
	
	function setter(statName, valueObject){
		// Sets base stats on a Champion object instance.
		champion.baseStats.set(statName, valueObject.value, valueObject.perLevel);
	}	
	
	setter("health", parsePerLevelInc(championObject["health"]));
	setter("attackDamage", parsePerLevelInc(championObject["damage"]));
	setter("armor", parsePerLevelInc(championObject["armor"]));
	setter("magicResist", parsePerLevelInc(championObject["magic res."]));
	setter("mana", parsePerLevelInc(championObject["mana"]));
	return champion;
}

var Stat = function(statName, value, perLevel) {
	this.name = statName;
	this.value = value;
	this.perLevel = perLevel || 0;
}

var Stats = function(){
	this.stats = {};
}
Stats.prototype.set = function(statName, value, perLevel) {
	this.stats[statName] = new Stat(statName, value, perLevel);
}
Stats.prototype.get = function(statName, champLevel) {
	var stat = this.stats[statName];
	if (!stat) {
		return 0;
	}
	return stat.value + ((champLevel || 0) * stat.perLevel);
}

var Rune = function(){}
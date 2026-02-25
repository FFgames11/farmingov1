/* =========================================================
   ARENA / PVP DATA (from Farmingo [PVP])
========================================================= */

// Cell table: universal scaling per level
const LEVEL_SCALING_TABLE = [
  ["Level", "ATK", "DEF", "SPEED"],
  ["Each level up", "+1", "+1", "+1"]
];


// Cell table: animal roster base stats
const ANIMAL_BASE_TABLE = [
  ["Animal", "Role", "ATK (Lv1)", "DEF (Lv1)", "SPEED (Lv1)"],
  ["Rabbit", "Speed hitter", "5", "3", "9"],
  ["Dog", "Balanced fighter", "6", "6", "6"],
  ["Deer", "Evasive support", "4", "5", "8"],
  ["Cat", "Crit trickster", "7", "4", "8"],
  ["Lion", "Heavy bruiser", "9", "7", "4"],
  ["Panda", "Tank healer", "5", "9", "3"],
  ["Fox", "Debuff controller", "6", "4", "9"],
  ["Alligator", "Armor shredder", "8", "6", "5"]
];


// Cell table: per-level stats (Lv1-Lv5)
const ANIMAL_LEVEL_TABLE = [
  ["Animal", "Level", "ATK", "DEF", "SPEED"],
  ["Rabbit", "Lv1", "5", "3", "9"],
  ["Rabbit", "Lv2", "6", "4", "10"],
  ["Rabbit", "Lv3", "7", "5", "11"],
  ["Rabbit", "Lv4", "8", "6", "12"],
  ["Rabbit", "Lv5", "9", "7", "13"],
  ["Dog", "Lv1", "6", "6", "6"],
  ["Dog", "Lv2", "7", "7", "7"],
  ["Dog", "Lv3", "8", "8", "8"],
  ["Dog", "Lv4", "9", "9", "9"],
  ["Dog", "Lv5", "10", "10", "10"],
  ["Deer", "Lv1", "4", "5", "8"],
  ["Deer", "Lv2", "5", "6", "9"],
  ["Deer", "Lv3", "6", "7", "10"],
  ["Deer", "Lv4", "7", "8", "11"],
  ["Deer", "Lv5", "8", "9", "12"],
  ["Cat", "Lv1", "7", "4", "8"],
  ["Cat", "Lv2", "8", "5", "9"],
  ["Cat", "Lv3", "9", "6", "10"],
  ["Cat", "Lv4", "10", "7", "11"],
  ["Cat", "Lv5", "11", "8", "12"],
  ["Lion", "Lv1", "9", "7", "4"],
  ["Lion", "Lv2", "10", "8", "5"],
  ["Lion", "Lv3", "11", "9", "6"],
  ["Lion", "Lv4", "12", "10", "7"],
  ["Lion", "Lv5", "13", "11", "8"],
  ["Panda", "Lv1", "5", "9", "3"],
  ["Panda", "Lv2", "6", "10", "4"],
  ["Panda", "Lv3", "7", "11", "5"],
  ["Panda", "Lv4", "8", "12", "6"],
  ["Panda", "Lv5", "9", "13", "7"],
  ["Fox", "Lv1", "6", "4", "9"],
  ["Fox", "Lv2", "7", "5", "10"],
  ["Fox", "Lv3", "8", "6", "11"],
  ["Fox", "Lv4", "9", "7", "12"],
  ["Fox", "Lv5", "10", "8", "13"],
  ["Alligator", "Lv1", "8", "6", "5"],
  ["Alligator", "Lv2", "9", "7", "6"],
  ["Alligator", "Lv3", "10", "8", "7"],
  ["Alligator", "Lv4", "11", "9", "8"],
  ["Alligator", "Lv5", "12", "10", "9"]
];


const BATTLE_ANIMALS = {
  "pig": { 
      "name": "Pig", 
      "emoji": "🐷", 
      "imagepath": '<img src="images/pig.png" alt="pig">',
      "rarity": "Starter", 
      "base": { 
        "atk": 5, 
        "def": 5,
        "spd": 5 
      }, 
      "skills": 
      { 
        "attack": 
        { 
          "name": "Tackle", 
          "power": 5 }, 
          "buff": 
          { 
            "name": "Mud Bath", 
            "desc":"Heal 5" }, 
            "ultimate": { 
              "name": 
              "Oink Blast", 
              "power": 8 } 
      } 
    },
  "rabbit": {
    "name": "Rabbit",
    "emoji": "🐰",
    "imagepath": '<img src="images/rabbit.png" alt="rabbit">',
    "rarity": "Common",
    "base": {
      "atk": 5,
      "def": 3,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Quick Kick",
        "power": 5,
        "desc": "If Rabbit acts first this round, deal +2 extra damage."
      },
      "buff": {
        "name": "Burst Step",
        "desc": "+3 SPEED for 2 turns. Next attack gains +1 SkillPower."
      },
      "ultimate": {
        "name": "Lightning Combo",
        "power": 3,
        "desc": "3 hits. Each hit uses SkillPower 3."
      }
    }
  },
  "dog": {
    "name": "Dog",
    "emoji": "🐶",
    "imagepath": '<img src="images/dog.png" alt="dog">',
    "rarity": "Common",
    "base": {
      "atk": 6,
      "def": 6,
      "spd": 6
    },
    "skills": {
      "attack": {
        "name": "Bite",
        "power": 6,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Guard Stance",
        "desc": "+3 DEF for 2 turns. Reduce next incoming damage by 2."
      },
      "ultimate": {
        "name": "Loyal Rush",
        "power": 9,
        "desc": "If Dog is below 50% HP, heal 3."
      }
    }
  },
  "deer": {
    "name": "Deer",
    "emoji": "🦌",
    "imagepath": '<img src="images/deer.png" alt="deer">',
    "rarity": "Uncommon",
    "base": {
      "atk": 4,
      "def": 5,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Antler Jab",
        "power": 5,
        "desc": "30% chance: enemy SPEED -2 for 1 turn."
      },
      "buff": {
        "name": "Calm Breath",
        "desc": "Heal 4. Gain +2 DEF for 1 turn."
      },
      "ultimate": {
        "name": "Forest Grace",
        "power": 0,
        "desc": "Heal 7. Gain evasion for 1 turn (next hit deals 0)."
      }
    }
  },
  "cat": {
    "name": "Cat",
    "emoji": "🐱",
    "imagepath": '<img src="images/cat.png" alt="cat">',
    "rarity": "Uncommon",
    "base": {
      "atk": 7,
      "def": 4,
      "spd": 8
    },
    "skills": {
      "attack": {
        "name": "Claw Swipe",
        "power": 5,
        "desc": "25% crit chance. Crit adds +4 damage."
      },
      "buff": {
        "name": "Pounce Setup",
        "desc": "Next attack gains +3 SkillPower and ignores 2 DEF."
      },
      "ultimate": {
        "name": "Nine-Lives Trick",
        "power": 8,
        "desc": "If Cat would be KO'd in the next 2 turns, survive once at 1 HP."
      }
    }
  },
  "lion": {
    "name": "Lion",
    "emoji": "🦁",
    "imagepath": '<img src="images/lion.png" alt="lion">',
    "rarity": "Epic",
    "base": {
      "atk": 9,
      "def": 7,
      "spd": 4
    },
    "skills": {
      "attack": {
        "name": "Heavy Slash",
        "power": 7,
        "desc": "Deal damage."
      },
      "buff": {
        "name": "Roar",
        "desc": "+3 ATK for 2 turns. Enemy ATK -2 for 1 turn."
      },
      "ultimate": {
        "name": "King's Verdict",
        "power": 10,
        "desc": "If enemy has any debuff, deal +4 extra damage."
      }
    }
  },
  "panda": {
    "name": "Panda",
    "emoji": "🐼",
    "imagepath": '<img src="images/panda.png" alt="panda">',
    "rarity": "Rare",
    "base": {
      "atk": 5,
      "def": 9,
      "spd": 3
    },
    "skills": {
      "attack": {
        "name": "Palm Strike",
        "power": 5,
        "desc": "Gain +1 DEF permanently this fight (max +3)."
      },
      "buff": {
        "name": "Bamboo Snack",
        "desc": "Heal 5. Gain +2 DEF for 2 turns."
      },
      "ultimate": {
        "name": "Soft But Strong",
        "power": 6,
        "desc": "Deal damage. Reduce damage taken by 3 for 2 turns."
      }
    }
  },
  "fox": {
    "name": "Fox",
    "emoji": "🦊",
    "imagepath": '<img src="images/fox.png" alt="fox">',
    "rarity": "Rare",
    "base": {
      "atk": 6,
      "def": 4,
      "spd": 9
    },
    "skills": {
      "attack": {
        "name": "Sneak Fang",
        "power": 5,
        "desc": "Apply Hex: enemy DEF -2 for 2 turns."
      },
      "buff": {
        "name": "Illusion Veil",
        "desc": "+2 SPEED for 2 turns. Gain 20% dodge for 1 turn."
      },
      "ultimate": {
        "name": "Mind Game",
        "power": 8,
        "desc": "Steal 2 ATK or 2 DEF (whichever is higher) for 2 turns."
      }
    }
  },
  "alligator": {
    "name": "Alligator",
    "emoji": "🐊",
    "imagepath": '<img src="images/alligator.png" alt="alligator">',
    "rarity": "Epic",
    "base": {
      "atk": 8,
      "def": 6,
      "spd": 5
    },
    "skills": {
      "attack": {
        "name": "Chomp",
        "power": 6,
        "desc": "If enemy DEF ≥ 6, deal +2 extra damage."
      },
      "buff": {
        "name": "Iron Hide",
        "desc": "+4 DEF for 2 turns. SPEED -1 for 2 turns."
      },
      "ultimate": {
        "name": "Death Roll",
        "power": 9,
        "desc": "Enemy DEF -4 for 2 turns. If enemy already has a debuff, stun for 1 turn."
      }
    }
  }
};

// Stat scaling (Lv2 = Lv1 +1/1/1, etc.)
function battleStats(animalId, level=1){
  const meta = BATTLE_ANIMALS[animalId];
  const lv = clamp(parseInt(level||1,10) || 1, 1, 5);
  if(!meta) return { atk:1, def:1, spd:1 };
  const add = lv - 1;
  return { atk: meta.base.atk + add, def: meta.base.def + add, spd: meta.base.spd + add };
}

// Optional HP extension (makes healing meaningful)
function battleHpMax(level){
  const lv = clamp(parseInt(level||1,10) || 1, 1, 5);
  return 30 + (lv-1)*5;
}

function combinePet(uidToUpgrade){
  const idxA = zooPets.findIndex(p=>p.uid===uidToUpgrade);
  if(idxA < 0) return;
  const a = zooPets[idxA];
  if(!a.animalId){ showToast("This pet can't be combined.", 1200); return; }
  const lv = clamp(parseInt(a.level||1,10) || 1, 1, 5);
  if(lv >= 5){ showToast("Already max level.", 1200); return; }

  const idxB = zooPets.findIndex((p,i)=>i!==idxA && p.animalId===a.animalId && clamp(parseInt(p.level||1,10)||1,1,5)===lv);
  if(idxB < 0){
    showToast("Need a duplicate of the same level.", 1400);
    return;
  }

  // Remove both (remove larger index first)
  const rem = [idxA, idxB].sort((x,y)=>y-x);
  for(const r of rem) zooPets.splice(r,1);

  const meta = BATTLE_ANIMALS[a.animalId];
  const nextLv = Math.min(5, lv + 1);
  const upgraded = {
    uid: uid(),
    typeId: a.animalId,
    animalId: a.animalId,
    level: nextLv,
    emoji: meta.emoji,
    imagepath: meta.imagepath,
    name: meta.name,
    rarity: meta.rarity
  };
  zooPets.unshift(upgraded);

  saveState();
  updateUI();
  if(activeScreen === "zoo") requestAnimationFrame(()=>renderZooRoamingPets());

  showToast(`${meta.name} upgraded to Lv${nextLv}!`, 1400);
  openPetDetails(upgraded.uid);
}



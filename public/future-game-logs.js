/* Generated verified future-game archive. Do not edit by hand.
   This file is updated by the game-log sync workflow, not the statistic sheet. */
(function(root){
 const verified=window.PCBL_FUTURE_GAMES=[];
 const byId=new Map((root.PCBL_VERSUS||[]).map(g=>[g.id,g]));
 for(const g of verified)byId.set(g.id,g);
 root.PCBL_VERSUS=[...byId.values()];
})(window);

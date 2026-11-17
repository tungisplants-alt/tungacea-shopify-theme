/*
 * Schriftbreiten der Etiketten (Jost), damit die Bestellseite vorab misst, ob ein
 * Name aufs Etikett passt, genau wie der Etiketten-Generator es beim Fertigen
 * tut. Die Werte sind die Vorschubbreiten der Glyphen in 1/1000 Em, aus den
 * Daten des Generators. Was hier fehlt, kann der Laser nicht gravieren.
 *
 *  g400  Name der Pflanze (Jost 400), Schriftgroesse em2 mm, Sperrung tr2 mm
 *  g600  Gattung (Jost 600),          Schriftgroesse em1 mm, Sperrung tr1 mm
 *  maxw  Breite einer Zeile in mm (Etikettenlaenge minus Spitze, Logo, Rand)
 *  maxwOhne  dasselbe ohne Logo: Der Text beginnt am Rand statt hinter dem Logo
 *  utMit, utOhne  Beginn des Textes in mm vom flachen Ende (mit Logo, ohne Logo)
 *  sh, gb1, gb2, nb1, nb2  Grundlinien von Gattung und Name (1 oder 2 Zeilen), quer zum Text
 *
 * Aendert sich die Schrift oder das Etikett im Generator, muessen diese Werte
 * mit. tests/schrift-test.js prueft sie gegen die Daten des Generators.
 */
window.TUNGACEA_SCHRIFT = {
  maxw: 62.9782,
  maxwOhne: 78.6,
  utMit: 19.5218, utOhne: 3.9,
  sh: -0.75, gb1: 7.95, gb2: 6.85, nb1: [11.35], nb2: [9.95, 12.55],
  em1: 2.65, tr1: 0.371,
  em2: 2.3, tr2: 0.161,
  g400: {"A":660,"B":558,"C":685,"D":680,"E":550,"F":500,"G":775,"H":715,"I":245,"J":240,"K":565,"L":450,"M":810,"N":775,"O":790,"P":548,"Q":790,"R":560,"S":548,"T":465,"U":626,"V":660,"W":990,"X":555,"Y":561,"Z":545,"0":600,"1":450,"2":569,"3":546,"4":583,"5":564,"6":576,"7":525,"8":546,"9":576," ":300,".":300,",":308,";":330,":":300,"'":285,"’":275,"‘":275,"\"":465,"(":310,")":310,"[":300,"]":300,"#":605,"+":615,"-":210,"–":740,"/":515,"&":675,"×":596,"!":300,"?":557,"%":751,"°":278,"@":770,"_":500,"Ä":660,"Ö":790,"Ü":626,"É":550,"È":550,"Ê":550,"Á":660,"À":660,"Â":660,"Ó":790,"Ò":790,"Ô":790,"Ú":626,"Ù":626,"Û":626,"Í":245,"Ì":245,"Î":245,"Ç":685,"Ñ":775},
  g600: {"A":711,"B":631,"C":696,"D":716,"E":586,"F":536,"G":802,"H":764,"I":296,"J":302,"K":658,"L":504,"M":866,"N":788,"O":811,"P":599,"Q":841,"R":620,"S":601,"T":531,"U":677,"V":711,"W":1041,"X":645,"Y":629,"Z":596,"0":643,"1":491,"2":629,"3":597,"4":662,"5":620,"6":640,"7":579,"8":602,"9":640," ":300,".":315,",":319,";":373,":":315,"'":300,"’":314,"‘":314,"\"":501,"(":331,")":331,"[":343,"]":343,"#":648,"+":656,"-":219,"–":770,"/":579,"&":728,"×":596,"!":330,"?":605,"%":867,"°":291,"@":770,"_":521,"Ä":711,"Ö":811,"Ü":677,"É":586,"È":586,"Ê":586,"Á":711,"À":711,"Â":711,"Ó":811,"Ò":811,"Ô":811,"Ú":677,"Ù":677,"Û":677,"Í":296,"Ì":296,"Î":296,"Ç":696,"Ñ":788}
};

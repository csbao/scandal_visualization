const mainCharacters = ["Olivia", "Huck", "Quinn", "Harrison", "Abby", "Stephen", "Cyrus", "Fitz", "Billy", "Gideon", "Mellie", "Sally"].sort();
const files = ["0101.txt", "0102.txt", "0103.txt", "0104.txt", "0105.txt", "0106.txt", "0107.txt"];
const sceneLinesHeight = 2;
const sceneInteractions = [];

// preprocess
for (let i=0; i<mainCharacters.length; i++) {
  for (let j=i; j<mainCharacters.length; j++) {
    sceneInteractions.push({a: mainCharacters[i], b: mainCharacters[j], weight: 0});
  }
}

function checkInteraction(a, b, first, second) {
  return a == first && b == second;
}
function updateHelper(i, j, first, second) {
  for(var k = cursorIndex; k<sceneInteractions.length; k++, cursorIndex++) {
    if (checkInteraction(sceneInteractions[k].a, sceneInteractions[k].b, first, second)) {
      sceneInteractions[k].weight++;
      return;
    }
  }
}
function updateInteractions(sceneTracker) {
  sceneTracker = sceneTracker.sort();
  cursorIndex = 0;
  for (let i=0; i<sceneTracker.length; i++) {
    for (let j=i; j<sceneTracker.length; j++) {
      updateHelper(i, j, sceneTracker[i], sceneTracker[j]);
    }
  }
}

const width = 600, height = 600;

var svgCont = d3.select("#container")
          .append("svg").attr("width", width).attr("height", height)
          .append("g")
          .attr("class", "container")

const svg = svgCont.append("g")

const y = d3.scaleLinear().range([height+30, 100]);
const lineLength = (d) =>  {return d.split(' ').length;}

const parseData = (text) => {
  var data = text.split('\n');
  var internalStructured = [];
  var scene = {};
  var currPerson = {};
  data = data.filter(function(d) { return d !== ""})
  var ctr = 0;

  data.forEach(function(d, i) {
    if (d.substring(0,5) === "SCENE") {
      ctr = -1;
      internalStructured.push(scene);
      scene = {scene: d, lines: []};
    }
    if (ctr%2 == 1 && ctr > 0) {
      currPerson["speaker"] = d;
    }
    else if (ctr%2 == 0) {
      currPerson["line"] = d;
      scene['lines'].push(currPerson);
      currPerson = {};
    }
    if (ctr == -1) ctr = 0;
    ctr++;
  });
  internalStructured.shift();
  return internalStructured;
};

let promises = [];
files.forEach(url => promises.push(d3.text(`http://localhost:8080/data/${url}`)));

var structured = [];
var m = [];
var curr = 0;

Promise.all(promises).then(function(items) {
  // if (error) throw error;
  let objs = [];
  items.forEach(function(item) {
    var res = parseData(item);
    objs.push(res);
    curr += res.reduce((acc, obj) => {
      return acc + obj.lines.reduce((acc2, obj2) => {
        return acc2 + lineLength(obj2.line)
      }, 0);
    }, 0);
    res.forEach(scene => {
      let currSceneTracker = [];
      let quinnExists = false;
      scene.lines.forEach(line => {
        var isMainCharacter = (mainCharacters.includes(line.speaker));
        if (!(currSceneTracker.includes(line.speaker))) {

          if (isMainCharacter) currSceneTracker.push(line.speaker);
        }
        if (!isMainCharacter && !currSceneTracker.includes("other")) currSceneTracker.push("other");
      });
      updateInteractions(currSceneTracker);
      if(quinnExists) quinnTracker +=1;

    });
    m.push(curr);

  });
  createAdjacencyMatrix(mainCharacters, sceneInteractions, svg);
  visualizeScenes(objs.flat(), svg);

});
function visualizeScenes(structured, svg) {
  var allSpeakers = new Set();
  structured.forEach(function(d) {
    // allSpeakers.add()
    d.lines.forEach(function(c) {
      allSpeakers.add(c.speaker);
    })
  });
  //allSpeakers is a set containing unique speakers in this episode.
  //structured is every line in the episode grouped by scene.
  allSpeakers = Array.from(allSpeakers);
  // var speakers = d3.scaleOrdinal().domain(s).range(s.map((d,i) => i * width/ s.length));
  var speakers = d3.scaleOrdinal().domain(allSpeakers).range(allSpeakers.map((d,i) => i * width/ allSpeakers.length + 100));
  var colorScale = d3.scaleOrdinal(d3.schemePaired);

  var min = 9999999;
  var max = -1;
  var lineCount = 0;
  var totalLineCount = 0;
  structured.forEach(function(d, i) {
    d.lines.forEach(function(c) {
      const len = lineLength(c.line);

      if (len < min) min = len;
      if (len >= max) max = len;
      lineCount += len;
      totalLineCount += 1;
    });
  });
  const naturalDomain = [50, height]
  var scaleLine = d3.scaleLinear().domain([min, max]).range([0.2, 100])
  var scaleLineMini = d3.scaleLinear().domain([min, max]).range([0.2, 30])

  var scalePos = d3.scaleLinear().domain([0, lineCount]).range([0, height]);
  var scalePosMini = d3.scaleLinear().domain([0, lineCount]).range(naturalDomain.map(d => d/2));
  var currCount = 0;
  var counter = 0;
  structured.forEach(function(d, i) {
    d.lines.forEach(function(e,j) {
      e.start = currCount;
      currCount += lineLength(e.line);
    })
  });

  miniContainerWidth = width / 3;
  miniContainerHeight = height / 6;
  const mapCont = svg.append("g").attr("class", "linemap")

  const miniCont = svg.append("g").attr("class", "minimap")
                .attr("width", miniContainerWidth)
                .attr("height", miniContainerHeight)
                .attr("transform", `translate(${miniContainerWidth/2+40}, ${height/4})`);
  // draw legend
  let legend = mapCont.append("g").attr("class", "sceneLegend")
              .attr("transform", `translate(${miniContainerWidth/2+40}, 0)`);

  let inter = legend.selectAll("stop")
      .data(mainCharacters.map((speaker, i) => ({speaker, offset: i*10, color: colorScale(speaker)})))
  inter.enter().append("rect")
      .attr("fill", d => d.color)
      .attr("y", d => d.offset)
      .attr("height", 10).attr("width", 10);
  inter.enter().append("text")
      .attr("x", 10)
      .attr("y", d => d.offset + 10)
      .text(d => d.speaker)

  structured.forEach(function(d,i) {
    let linesOfInterest = d.lines.filter(e => mainCharacters.includes(e.speaker));
    const g = mapCont.append("g");
    g.selectAll(`scene_lines`)
      .data(linesOfInterest)
      .enter()
      .append("rect")
      .attr("class", (e) => {
        return `scene_lines ${e.speaker}`
      })
      .attr("width", (e) => scaleLine(lineLength(e.line)))
      .attr("height", sceneLinesHeight)
      .attr("y", e => scalePos(e.start))
      .attr("x", 30)
      .style("fill", (e) => { var position = mainCharacters.indexOf(e.speaker); return position >= 0 ? colorScale(e.speaker) : "grey"})
      .on('mouseover', (d) => { d3.select('#textbox').html(`${d.speaker}<br><br>${d.line}`) });

    const g2 = miniCont.append("g")

    g2.selectAll(`miniscene_lines`)
      .data(linesOfInterest)
      .enter()
      .append("rect")
      .attr("class", (e) => {
        return `miniscene_lines ${e.speaker}`
      })
      .attr("width", (e) => scaleLine(lineLength(e.line))) //height should be  afunction of the length
      .attr("height", sceneLinesHeight)
      .attr("y", e => { var ret = scalePosMini(e.start); return ret; })
      .attr("x", 10)
      .style("fill", (e) => { var position = mainCharacters.indexOf(e.speaker); return position >= 0 ? colorScale(e.speaker) : "grey"})

  });

  // episodes in minimap
  var g = miniCont.append("g").attr("class", "mini_episode_lines")

  let entered = g.selectAll("miniepisodes")
      .data(m.slice(0, m.length-1))
      .enter();
  entered
      .append("rect")
      .attr("class", "miniepisodes")
      .attr("height", 0.8)
      .attr("width", 100)
      .attr("y", (e) => scalePosMini(e))
      .attr("x", 10);
  entered.append("text").attr("class", "episodelabels")
          .attr("x", miniContainerWidth/4).attr("y", (e) => scalePosMini(e))
          .text((e,i) => `episode ${i+1}`)
          .attr("alignment-baseline","end");

  // Add brushing
  var updateLines = function() {
    const extent = d3.event.selection;
    if (!d3.event.sourceEvent || !extent) return;

    const [y0, y1] = extent;

    scalePos.domain([scalePosMini.invert(y0), scalePosMini.invert(y1)])

    miniCont.select(".brush").call(brush)//.move, y1 > y0 ? [y0, y1].map(scalePosMini) : null) //.call(brush.move, [[0,0], extent]);

    svg.selectAll("rect.scene_lines").transition().duration(1000)
      .attr("y", e => scalePos(e.start));

  }
  var brush = d3.brushY()                 // Add the brush feature using the d3.brush function
      .extent( [ [0,0], [miniContainerHeight, miniContainerWidth] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
      .on("end", updateLines) // Each time the brush selection changes, trigger the 'updateChart' function

  miniCont.append("g").attr("class", "brush").call(brush);

}

// handle interaction clicking
let selectedId = "";

function createAdjacencyMatrix(nodes, edges, svg) {
  // var g = svg.append("g")
  var g = d3.select("svg")

  var edgeHash = {};
  edges.forEach(edge => {
    var id = `${edge.a}-${edge.b}`;
    edgeHash[id] = edge;
  });

  var matrix = [];

  for (let i=0; i<nodes.length; i++) {
    for (let j=i; j<nodes.length; j++) {
      var grid = {
        id: `${nodes[i]}-${nodes[j]}`,
        x: j,
        y: i, weight: 0
      };
      if (edgeHash[grid.id]) {
        grid.weight = edgeHash[grid.id].weight;
      }
      matrix.push(grid);
    }
  }

  let weights = matrix.map(elt => {
    return elt.weight
  });
  let weightsBySpeaker = {};

  matrix.forEach(elt => {
    let [a, b] = elt.id.split("-");
    if (a in weightsBySpeaker) {
      weightsBySpeaker[a].push(elt.weight);
    } else {
      weightsBySpeaker[a] = [elt.weight];
    }
    if (a!=b) {
      if (b in weightsBySpeaker) {
        weightsBySpeaker[b].push(elt.weight);
      } else {
        weightsBySpeaker[b] = [elt.weight];
      }
    }
  });

  // create scale depending on the speaker -- compute relative frequency for the user itself so that upon query, we can determine which is smaller
  let scalesBySpeaker = Object.assign({}, weightsBySpeaker);
  Object.keys(scalesBySpeaker).forEach((key, idx) => {
    scalesBySpeaker[key] = d3.scaleLinear().domain([d3.min(scalesBySpeaker[key]), d3.max(scalesBySpeaker[key])]).range(["#F2F2F2", "#003366"]);
  });

  let legend = g.append("g").attr("id", "gridlegend")
      .attr("transform", `translate(400,50)rotate(45)`);
  legend.append("text").attr("class", "legendtitle")
          .attr("x", 20).attr("y", 15)
          .text("Relative frequency of scenes between two characters")
          // .style("font-size", "10px")

  let colorScale = d3.scaleLinear().domain([0,10]).range(["#F2F2F2", "#003366"]);

  let legend2 = legend.selectAll("stop")
      .data([...Array(11).keys()].map((t, i, n) => ({ offset: 20*i, color: colorScale(t), proportion: `${i*10}%` })))
    ;
  legend2.enter()
      .append("rect")
      .attr("fill", d => d.color)
      .attr("x", d => d.offset)
      .attr("y", 20)
      .attr("height", 10).attr("width", 20);

  legend2.enter().append("text")
          .attr("x", d => d.offset)
          .attr("y", 35)
          .text(d => d.proportion)
          // .style("font-size", "6px")
          .attr("alignment-baseline","middle");

  g
    .append("g")
      .attr("transform", "translate(320,50)")
      .attr("id", "mastergrid")
    .selectAll("rect")
    .data(matrix)
    .enter()
    .append("rect")
      .attr("class", "heatmap")
      .attr("transform", `rotate(45)`)
      .attr("width", 25)
      .attr("height", 25)
      .attr("x", d => d.x * 25)
      .attr("y", d => d.y * 25)
      .attr("fill", d => {
        // Use relative frequency to color the cells of the matrix.
        let [firstCharacter, secondCharacter] = d.id.split('-');
        let first = weightsBySpeaker[firstCharacter].reduce(function(a, b) {
          return a + b;
        }, 0);
        let second = weightsBySpeaker[secondCharacter].reduce(function(a, b) {
          return a + b;
        }, 0);

        // Use the smaller weight to compute relative frequency
        if (first < second) {
          return scalesBySpeaker[firstCharacter](d.weight)
        } else {
          return scalesBySpeaker[secondCharacter](d.weight);
        }
       });

  //labels
  g
    .append("g")
      // .attr("class", "labels")
      .attr("transform", `translate(290,50)rotate(-45)`)
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
      .attr("x", (d, i) => i * -25 + 20 )
      .attr("y", (d,i) => i * 25 + 20)
      .text(d => d)
      .style("text-anchor", "end"); // This is an SVG only property -- cannot apply thru CSS.

  d3.select("#mastergrid").selectAll("rect.heatmap").on("mouseover", gridOver).on("mouseout", gridOut).on("click", gridClick);
  function gridOver(d) {
    d3.selectAll("rect")
      .transition().duration(300)
      .style("stroke-width", function (p) {
        return ((p.x == d.x && p.y >= d.y)|| (p.y == d.y && p.x <= d.x) || p.id == selectedId) ? "4px" : "1px";
      });
  }
  function gridOut(d) {
    d3.selectAll("rect").transition().duration(300)
    .style("stroke-width", function(d) {
      return d.id == selectedId ? "4px" : "1px"
    });
  }
  function gridClick(d) {
    let [a,b] = d.id.split('-');
    if (selectedId == d.id) {
      d3.selectAll("rect").transition().duration(300).style("stroke-width", "1px");
      d3.selectAll("rect.scene_lines").transition().duration(400).attr("height", sceneLinesHeight);
      d3.selectAll("rect.miniscene_lines").transition().duration(400).attr("height", sceneLinesHeight);
      selectedId = ""; //reset selected id
    } else {
        selectedId = d.id;
        d3.selectAll("rect").transition()
            .duration(300)
            .style("stroke-width", function (p) {
              return (p.id == d.id )? "4px" : "1px";
            });
        d3.selectAll("rect.scene_lines").transition().duration(400).attr("height", function(e) {
          if ([a,b].includes(e.speaker)) {
            return sceneLinesHeight;
          } else {
            return 0;
          }
        });

        d3.selectAll("rect.miniscene_lines").transition().duration(400).attr("height", function(e) {
          if ([a,b].includes(e.speaker)) {
            return sceneLinesHeight;
          } else {
            return 0;
          }
        });
    }
  }
}

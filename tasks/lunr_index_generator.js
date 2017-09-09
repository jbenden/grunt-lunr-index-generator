/*
 * grunt-lunr-index-generator
 * https://github.com/jediq/documento/grunt-lunr-index-generator
 *
 * Copyright (c) 2015 Ricky Walker
 * Licensed under the MIT license.
 */

'use strict';

var lunr = require('lunr');
var cheerio = require('cheerio');

module.exports = function(grunt) {

    function getMethods(obj) {
        var result = [];
        for (var id in obj) {
            try {
                if (typeof(obj[id]) === "function") {
                    result.push(id + ": " + obj[id].toString());
                }
            } catch (err) {
                result.push(id + ": inaccessible");
            }
        }
        return result;
    }

    // FIXME: Snag the YAML front matter and parse out "tags" list element.
    function generateMarkdownDoc(body, doc) {
        var h1s = [];
        var h2s = [];
        var h3s = [];

        body.split('\n').forEach(function (line) {
            if (line.lastIndexOf('###', 0) === 0) {
                h3s.push(line);
            } else if (line.lastIndexOf('##', 0) === 0) {
                h2s.push(line);
            } else if (line.lastIndexOf('#', 0) === 0) {
                var re = /^#\s*([^{]*)(?:\s+\{(#[^\}]*)\}|)$/i;

                var result = re.exec(line);
                if (result !== null) {
                    h1s.push(result[1]);
                    doc.title = result[1];
                    doc.url = result[2] || doc.url;
                } else {
                    h1s.push(line);
                    doc.title = line.substring(2).trim();
                }
            }
            doc.h1 = h1s.join(',');
            doc.h2 = h2s.join(',');
            doc.h3 = h3s.join(',');
        });

        return doc;
    }

    // FIXME: Find keywords metadata and store in to the "tags" doc element.
    function generateHtmlDoc(body, doc) {
        var $ = cheerio.load(body);

        doc.title = $('title').text();
        doc.h1s = $('h1').map(function(i, element){return $(element).text();}).get().join(",");
        doc.h2s = $('h2').map(function(i, element){return $(element).text();}).get().join(",");
        doc.h3s = $('h3').map(function(i, element){return $(element).text();}).get().join(",");

        return doc;
    }

    grunt.registerMultiTask('lunr_index_generator',
                            'A Grunt plugin to generate a lunr.js index files from markdown and html files.',
                            function() {

                                var files = this.files;
                                var jsLunr = lunr;
                                var idx = new lunr.Builder;

                                idx.pipeline.add(jsLunr.trimmer, jsLunr.stopWordFilter, jsLunr.stemmer);
                                idx.searchPipeline.add(jsLunr.stemmer);

                                //var idx = lunr(function () {
                                    idx.field('name', { boost: 10 });
                                    idx.field('title', { boost: 10 });
                                    idx.field('h1', { boost: 8 });
                                    idx.field('h2', { boost: 5 });
                                    idx.field('h3', { boost: 3 });
                                    idx.field('tags', { boost: 3 });
                                    idx.field('body');

                                    var me = idx;
                                    var docs = [];
                                    
                                    files.forEach(function (fileGroup) {

                                        fileGroup.src.forEach(function(file) {

                                            var fileExt = file.split('.').pop();
                                            var body = grunt.file.read(file);

                                            var doc = {
                                                id:file.toString(),
                                                name:file.toString(),
                                                url:file.toString(),
                                                date:'2017-09-08', // FIXME: Read YAML front matter for contents.
                                                categories:[],
                                                tags:[],
                                                is_post:false,
                                                h1:'',
                                                h2:'',
                                                h3:'',
                                                body:body
                                            };

                                            if (fileExt === 'md' || fileExt === 'markdown') {
                                                doc = generateMarkdownDoc(body, doc);
                                                me.add(doc);
                                            }

                                            if (fileExt === 'html') {
                                                doc = generateHtmlDoc(body, doc);
                                                me.add(doc);
                                            }

                                            docs.push(doc);
                                        });

                                        // var indexAsJson = JSON.stringify(me);
                                        // var docAsJson = JSON.stringify(docs);

                                        var theJson = {
                                            docs: docs,
                                            index: me.build()
                                        };
                                        var asJson = JSON.stringify(theJson);

                                        grunt.file.write(fileGroup.dest, asJson);


                                    });
                                //});
                            });

};

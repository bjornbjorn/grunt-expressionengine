/*
 * grunt-expressionengine
 * https://github.com/bjornbjorn/grunt-expressionengine
 *
 * Copyright (c) 2014 Bjørn Børresen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        settings: grunt.file.readJSON('settings.json'),

        rename: {
        ee: {
            files: [
                {src: ['<%= settings.system %>'], dest: 'backups/'+'<%= settings.system %>'},
                {src: ['<%= settings.webroot %>/themes'], dest: 'backups/<%= settings.webroot %>/themes'}
            ]
        }
    },

    copy: {
        ee: {
            files: [
                // includes files within path and its sub-directories
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['<%= settings.system %>/**'], dest: './'},
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['themes/**'], dest: '<%= settings.webroot %>'},
                {expand: true, cwd: 'backups/<%= settings.webroot %>/themes/', src: ['third_party/**'], dest: '<%= settings.webroot %>/themes'},
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['images/**'], dest: '<%= settings.webroot %>/images/'},
                {expand: true, flatten:true, src: ['backups/'+'<%= settings.system %>/expressionengine/config/config.php'], dest: '<%= settings.system %>/expressionengine/config/'},
                {expand: true, flatten:true, src: ['backups/'+'<%= settings.system %>/expressionengine/config/database.php'], dest: '<%= settings.system %>/expressionengine/config/'}
            ]
        },

        ee_new: {
            files: [
                // includes files within path and its sub-directories
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['<%= settings.system %>/**'], dest: './'},
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['themes/**'], dest: '<%= settings.webroot %>'},
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['images/**'], dest: '<%= settings.webroot %>/images/'},
                {expand: true, cwd: '<%= settings.ee_path %>', src: ['*.php'], dest: '<%= settings.webroot %>'}
            ]
        }
    },

    // @todo: dumps are prefixed with not secure to have password blabla.
    // @todo: dumps should be prefixed to drop all tables as upgrades may create new ones that still exist after importing an old dump.
    db_dump: {
        ee: {
            "options": {
                "title": '<%= settings.db_name %>',
                    "database": '<%= settings.db_name %>',
                    "user": '<%= settings.db_username %>',
                    "pass": '<%= settings.db_password %>',
                    "host": '<%= settings.db_host %>',
                    "backup_to": 'backups/db/<%= settings.db_name %>_<%= grunt.template.today("yyyy_mm_dd-HH_MM_ss") %>.sql'
            }
        }
    },

    prompt: {
        ee: {
            options: {
                questions: [
                    {
                        config: 'upgrade_ee.allok', // arbitray name or config for any other grunt task
                        type: 'confirm', // list, checkbox, confirm, input, password
                        message: 'Load the website in your browser now and upgrade - when it is finished hit Y to delete system/installer.',    // @TODO: fix so system/installer is deleted + do another db dump at this point!
                        default: 'Y' // default value if nothing is entered
                    }
                ]
            }
        }
    },
    clean: ['<%= settings.system %>/installer', 'backups']

});

grunt.registerTask("update_addon", "Register a single addon", function(addon_name) {
    var third_party_dir = grunt.config.get('settings.third_party');

    // If addon name is sent as a parameter, that takes presence
    var addon_name_param = grunt.option('addon-name');
    var single_addon = false;
    if(addon_name_param) {
        single_addon = true;
        addon_name = addon_name_param;
        if(!grunt.file.isDir(third_party_dir+'/'+addon_name_param)) {
            grunt.log.error('Could not find an addon named ' + addon_name_param + ' in ' + third_party_dir+'/'+addon_name_param);
            return false;
        }
    }

    if(!addon_name) {
        grunt.log.error("No addon name specified - use --addon-name=seo_lite for example");
        return false;
    }

    var addon_source_dir = grunt.config.get('settings.ee_addons_path')+addon_name+'/system/expressionengine/third_party/'+addon_name;
    var addon_theme_source_dir = grunt.config.get('settings.ee_addons_path')+addon_name+'/themes/third_party/'+addon_name;
    var current_addon_dir = third_party_dir + '/' + addon_name;
    var webroot = grunt.config.get('settings.webroot');
    var current_addon_theme_dir = webroot + '/themes/third_party/'+addon_name;

    var path = require("path");

    grunt.log.subhead("Updating: " + addon_name);

    if(!grunt.file.isDir(addon_source_dir)) {
        grunt.log.error("Could not find: "+addon_source_dir)
    } else {

        if(single_addon) {
            grunt.task.run('db_dump:ee');       // schedule a db dump
        }

        grunt.log.writeln("Backing up " + current_addon_dir);
        grunt.file.mkdir('backups/'+third_party_dir+'/'+current_addon_dir);
        grunt.file.recurse(current_addon_dir, function(absdir, rootdir, subdir, filename) {
            grunt.log.writeln("Backup: " + current_addon_dir + (subdir?'/'+subdir:'')+'/'+filename);
            grunt.file.copy(absdir, path.join('backups/'+ third_party_dir + '/' +current_addon_dir, subdir ? subdir : '', filename));
        });

        grunt.log.writeln("Deleting " + current_addon_dir + "/*.* ...");
        grunt.file.delete(current_addon_dir);
        grunt.file.mkdir(current_addon_dir);
        grunt.log.writeln("Copying " + addon_source_dir + " to " + current_addon_dir + " ...");

        grunt.file.recurse(addon_source_dir, function(absdir, rootdir, subdir, filename) {
            grunt.log.writeln("Copy: " + (subdir?subdir:'')+'/'+filename);
            grunt.file.copy(absdir, path.join(current_addon_dir, subdir ? subdir : '', filename));
        });

        // if this addon has theme files we copy them as well
        if(grunt.file.isDir(addon_theme_source_dir)) {
            grunt.log.writeln("Deleting " + current_addon_theme_dir + " ...");
            grunt.file.delete(current_addon_theme_dir);
            grunt.file.mkdir(current_addon_theme_dir);

            grunt.log.writeln("Copying " + addon_theme_source_dir + " to " + current_addon_theme_dir + " ...");
            grunt.file.recurse(addon_theme_source_dir, function(absdir, rootdir, subdir, filename) {
                grunt.log.writeln("Copy: " + (subdir?subdir:'')+'/'+filename);
                grunt.file.copy(absdir, path.join(current_addon_theme_dir, subdir ? subdir : '', filename));
            });
        }

        grunt.log.ok(addon_name + " updated OK!");
        grunt.log.write('Check the website frontend + CP - if it is all good it is all good. If not there are backups/');
    }
});

grunt.registerTask("update_addons", "Update all addons in your EE install (will prompt after each one)", function() {
    var tasks = [];

    // read all subdirectories from your modules folder
    var third_party_src = grunt.config.get('settings.third_party');

    grunt.file.expand({'cwd':third_party_src},"*").forEach(function(dir){


        var prompt_config = grunt.config.get('prompt') || {};

        // set the config for this modulename-directory
        prompt_config['update_addon/'+dir] = {
            options: {
                questions: [
                    {
                        config: 'config.update_addon', // arbitray name or config for any other grunt task
                        type: 'list', // list, checkbox, confirm, input, password
                        message: 'What to do next?',
                        default: 'continue', // default value if nothing is entered
                        choices: [
                            {
                                name: 'Continue to next addon' , value : 'continue'
                            },
                            {
                                name: 'Abort everything (just quit!)', value : 'abort'
                            }
                        ]
                    }
                ]
            }
        }

        grunt.config.set('prompt', prompt_config);
        tasks.push('update_addon:' + dir);
        tasks.push('prompt:update_addon/'+dir);
    });

    // queues the tasks and run when this current task is done
    grunt.task.run(tasks);

});


grunt.registerTask('init:ee_new', 'Install new EE', function() {

    if(grunt.file.isDir(grunt.config.get('settings.system'))) {
        grunt.log.error('Directory \''+grunt.config.get('settings.system')+'\' already exists - this task is used to install a new EE (starting from an empty location)');
    }

    grunt.file.mkdir(grunt.config.get('settings.webroot'));

});


grunt.registerTask('init:ee', 'Initialize EE upgrade (do backups)', function() {

    if(grunt.file.isDir('backups')) {
        grunt.log.error('Directory \'backups\' already exists - that\'s where I will store the backups. Please rename or delete it before running the upgrade');
        return false;
    }

    if(!grunt.file.isDir(grunt.config.get('settings.system'))) {
        grunt.log.error('Could not find system directory: ./'+grunt.config.get('settings.system'));
        grunt.log.error('If this is not the correct directory update your settings.json file');
        return false;
    }

    grunt.log.write('Creating backup directories ...');

    grunt.file.mkdir('backups');
    grunt.file.mkdir('backups/db');
    grunt.file.mkdir('backups/'+grunt.config.get('settings.webroot'));
    grunt.file.mkdir('backups/'+grunt.config.get('settings.third_party'));
});

/**
 * Set the correct permissions on certain folders
 */
grunt.registerTask('set_permissions:ee', 'Sets permissions on files', function() {
    var fs = require('fs');

    var system_folder = grunt.config.get('settings.system');
    fs.chmodSync(system_folder+'/expressionengine/cache', '777');
    fs.chmodSync(system_folder+'/expressionengine/config/config.php', '666');
    fs.chmodSync(system_folder+'/expressionengine/config/database.php', '666');
});


grunt.task.registerTask('install:ee',['init:ee_new', 'copy:ee_new']);
grunt.task.registerTask('update:ee', ['init:ee', 'db_dump:ee', 'rename:ee', 'copy:ee', 'set_permissions:ee', 'prompt:ee']);
grunt.task.registerTask('update:addons', ['update_addons']);
grunt.task.registerTask('update:addon', ['update_addon']);

grunt.task.registerTask('clean', 'clean');

grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-rename');
grunt.loadNpmTasks('grunt-prompt');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-mysql-dump');



};

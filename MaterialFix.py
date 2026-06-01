#!/usr/bin/env python3
# -*- mode: python-mode; python-indent-offset: 4; -*-
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: © 2022 Stanislas Daniel Claude Dolcini
from argparse import ArgumentParser
from logging import getLogger, StreamHandler, INFO, WARNING, Formatter, Filter
from pathlib import Path
from sys import stdout, stderr
import xml.etree.ElementTree as ET
import os
import shutil
import json
import fileinput

LOGGER_FIRST_INIT = True

class SingleLevelFilter(Filter):
    def __init__(self, passlevel, reject):
        self.passlevel = passlevel
        self.reject = reject

    def filter(self, record):
        if self.reject:
            return (record.levelno != self.passlevel)
        else:
            return (record.levelno == self.passlevel)


class BaseFixer():
    def __init__(self, vfs_root, verbose=False):
        self.logger = self.__init_logger()
        self.vfs_root = Path(vfs_root)
        self.verbose = verbose
        self.files = []

    def __init_logger(self):
        global LOGGER_FIRST_INIT
        logger = getLogger(__name__)
        if LOGGER_FIRST_INIT:
            logger.setLevel(INFO)
            # create a console handler, seems nicer to Windows and for future uses
            ch = StreamHandler(stdout)
            ch.setLevel(INFO)
            ch.setFormatter(Formatter('%(levelname)s - %(message)s'))
            f1 = SingleLevelFilter(INFO, False)
            ch.addFilter(f1)
            logger.addHandler(ch)
            errorch = StreamHandler(stderr)
            errorch.setLevel(WARNING)
            errorch.setFormatter(Formatter('%(levelname)s - %(message)s'))
            logger.addHandler(errorch)
            LOGGER_FIRST_INIT = False
        return logger

    def fix_style(self, xml_path):
        changes = [
            [' />', '/>'],
            ["version='1.0'", 'version="1.0"'],
            ["'utf-8'", '"utf-8"']
        ]
        for line in fileinput.input(xml_path, inplace=True):
            for change in changes:
                line = line.replace(change[0], change[1])
            print(line, end="")

        with open(xml_path, 'a', encoding='utf-8') as file:
            file.write('\n')

    def indent(self, elem, level=0, more_sibs=False):
        i = "\n"
        if level:
            i += (level-1) * '  '
        num_kids = len(elem)
        if num_kids:
            if not elem.text or not elem.text.strip():
                elem.text = i + "  "
                if level:
                    elem.text += '  '
            count = 0
            for kid in elem:
                self.indent(kid, level+1, count < num_kids - 1)
                count += 1
            if not elem.tail or not elem.tail.strip():
                elem.tail = i
                if more_sibs:
                    elem.tail += '  '
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = i
                if more_sibs:
                    elem.tail += '  '
    def sort(self, root):
        # sort the first layer
        root[:] = sorted(root, key=lambda child: (child.tag,child.get('name')))

        # sort the second layer
        for c in root:
            c[:] = sorted(c, key=lambda child: (child.tag,child.get('name')))
            for cp in c:
                cp[:] = sorted(cp, key=lambda child: (child.tag,child.get('name')))
                for scp in cp:
                    scp[:] = sorted(scp, key=lambda child: (child.tag,child.get('name')))

    def save_xml_file(self, tree, root, xml_file, sort=True):
        if sort:
            self.sort(root)
        self.indent(root)
        tree.write(xml_file, xml_declaration=True, encoding='utf-8')
        self.fix_style(xml_file)

    def add_files(self, path, extensions : tuple[str]):
        self.files = []
        if os.path.isfile(str(self.vfs_root)):
            self.files.append(self.vfs_root)
        elif os.path.isdir(str(self.vfs_root)):
            for root, _, files in os.walk(str(self.vfs_root)):
                for name in files:
                    file_path = os.path.join(root, name)
                    if os.path.isfile(file_path) and path in file_path and name.endswith(extensions):
                        self.files.append(file_path)
        if self.verbose:
                if len(self.files) > 0:
                    self.logger.info(f"Found {len(self.files)} file(s).")
                else:
                    self.logger.info(f"No files were found.")

class ActorsWithMaterialsWithNoSpecMapFixer(BaseFixer):
    def __init__(self, vfs_root, verbose=False):
        BaseFixer.__init__(self, vfs_root, verbose)
        self.add_files(os.path.join('art', 'actors'), tuple(".xml"))
        self.changes = [
            ['basic_spec', 'no_trans_spec'],
            ["blend_spec", 'basic_trans_spec'],
            ["objectcolor_spec", 'objectcolor_specmap'],
            ["playercolor_spec", 'player_trans_spec'],
        ]



    def process_actor(self, actorNode):
        materialCmp = actorNode.find('material')
        if materialCmp is not None:
            changed = False


            if (materialCmp.text == 'basic_spec.xml' or 
                materialCmp.text == 'blend_spec.xml' or
                materialCmp.text == 'objectcolor_spec.xml' or
                materialCmp.text == 'playercolor_spec.xml'):
                    for group in actorNode:
                        for variant in group:
                            cmpTextures = variant.find('textures')
                            if cmpTextures is not None:

                                found = False
                                for texture in cmpTextures:
                                    if texture.attrib['name']== 'specTex':
                                        found = True
                                        break

                                if found:
                                    continue

                                tag = ET.SubElement(cmpTextures, 'texture')
                                tag.attrib['name'] = 'specTex'
                                tag.attrib['file'] = 'null_white.dds'
                                changed = True

                            
                    for change in self.changes:
                        materialCmp.text = materialCmp.text.replace(change[0], change[1])
                    
                    return changed
        return False

    def run(self):
        count = 0
        for file in self.files:
            tree = ET.parse(file)
            root = tree.getroot()
            changed = False
            if root.tag == 'actor':
                changed = self.process_actor(root)
            elif root.tag == 'qualitylevels':
                for actor in root:
                    changed |= self.process_actor(actor)
            if changed:
                self.save_xml_file(tree, root, file, False)
                count = count + 1

        self.logger.info(f"Fixed {count} file(s).")


if __name__ == '__main__':
    parser = ArgumentParser(description='A26 to A27 converter.')
    parser.add_argument('-r', '--root', action='store', dest='root', default=os.path.dirname(os.path.realpath(__file__)))
    parser.add_argument('-m', '--mod', action='store', dest='mod', default='public')
    parser.add_argument('-v', '--verbose', action='store_true', default=False, help="Be verbose.")
    args = parser.parse_args()
    script_dir = args.root
    mod_name = args.mod
    print(f"Running in {Path(script_dir) / mod_name}")
    print("Fixing Actors using no specmap...")
    template_fixer = ActorsWithMaterialsWithNoSpecMapFixer(Path(script_dir) / mod_name)
    template_fixer.run()
